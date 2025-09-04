import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto } from './dto/purchase-tokens.dto';
import Stripe from 'stripe';

@Injectable()
export class TokenPurchaseService {
  private readonly logger = new Logger(TokenPurchaseService.name);
  private stripe: Stripe;

  // Fee percentages
  private readonly PLATFORM_FEE_PERCENT = 0.002; // 0.2%
  private readonly VENDOR_FEE_PERCENT = 0.005;   // 0.5%
  private readonly TOKEN_RATE = 100; // 1 USD = 100 tokens

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  /**
   * Calculate fees and token amount
   */
  private calculateFees(amount: number) {
    const platformFee = amount * this.PLATFORM_FEE_PERCENT;
    const vendorFee = amount * this.VENDOR_FEE_PERCENT;
    const totalFees = platformFee + vendorFee;
    const restAmount = amount - totalFees;
    const tokensReceived = restAmount * this.TOKEN_RATE;

    return {
      platformFee,
      vendorFee,
      restAmount,
      tokensReceived,
    };
  }

  /**
   * Create a token purchase session
   */
  async createTokenPurchase(userId: string, dto: PurchaseTokensDto): Promise<TokenPurchaseResponseDto> {
    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Validate vendor if provided
      if (dto.vendorId) {
        const vendor = await this.prisma.user.findUnique({
          where: { id: dto.vendorId },
          select: { id: true },
        });
        if (!vendor) {
          throw new BadRequestException('Vendor not found');
        }
      }

      // Calculate fees
      const fees = this.calculateFees(dto.amount);

      this.logger.log(`Creating token purchase for user ${userId}: $${dto.amount} -> ${fees.tokensReceived} tokens`);

      // Create Stripe Payment Intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(dto.amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          vendorId: dto.vendorId || '',
          type: 'token_purchase',
        },
        description: `Token Purchase - ${fees.tokensReceived} tokens`,
        receipt_email: user.email || undefined,
      });

      // Create token purchase record
      const tokenPurchase = await this.prisma.tokenPurchase.create({
        data: {
          userId,
          vendorId: dto.vendorId,
          amount: dto.amount,
          platformFee: fees.platformFee,
          vendorFee: fees.vendorFee,
          restAmount: fees.restAmount,
          tokensReceived: fees.tokensReceived,
          stripePaymentIntentId: paymentIntent.id,
          status: 'pending',
        },
      });

      return {
        id: tokenPurchase.id,
        amount: dto.amount,
        platformFee: fees.platformFee,
        vendorFee: fees.vendorFee,
        restAmount: fees.restAmount,
        tokensReceived: fees.tokensReceived,
        status: tokenPurchase.status,
        stripePaymentIntentId: paymentIntent.id,
      };

    } catch (error) {
      this.logger.error('Error creating token purchase:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create token purchase');
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(paymentIntentId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for payment intent: ${paymentIntentId}`);
        return;
      }

      if (tokenPurchase.status === 'completed') {
        this.logger.log(`Token purchase already completed: ${tokenPurchase.id}`);
        return;
      }

      // Update token purchase status
      await this.prisma.tokenPurchase.update({
        where: { id: tokenPurchase.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Credit tokens to user
      await this.prisma.user.update({
        where: { id: tokenPurchase.userId },
        data: {
          tokenBalance: {
            increment: tokenPurchase.tokensReceived,
          },
        },
      });

      this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens credited to user ${tokenPurchase.userId}`);

    } catch (error) {
      this.logger.error('Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment webhook
   */
  async handlePaymentFailed(paymentIntentId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for payment intent: ${paymentIntentId}`);
        return;
      }

      // Update status to failed
      await this.prisma.tokenPurchase.update({
        where: { id: tokenPurchase.id },
        data: {
          status: 'failed',
        },
      });

      this.logger.log(`Token purchase failed: ${tokenPurchase.id}`);

    } catch (error) {
      this.logger.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Get user's token balance
   */
  async getUserTokenBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.tokenBalance;
  }

  /**
   * Get user's token purchase history
   */
  async getUserTokenPurchases(userId: string) {
    return this.prisma.tokenPurchase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        platformFee: true,
        vendorFee: true,
        restAmount: true,
        tokensReceived: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }
}