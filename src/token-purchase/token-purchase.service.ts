import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import Stripe from 'stripe';
import { ethers } from 'ethers';

@Injectable()
export class TokenPurchaseService {
  private readonly logger = new Logger(TokenPurchaseService.name);
  private stripe: Stripe;

  private readonly TOKEN_RATE = 100; // 1 USD = 100 tokens

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  /**
   * Validate fee parameters provided by frontend
   */
  private validateFees(dto: PurchaseTokensDto) {
    const expectedRestAmount = dto.amount - (dto.platformFee + dto.vendorFee);
    const expectedTokensReceived = expectedRestAmount * this.TOKEN_RATE;

    if (Math.abs(dto.restAmount - expectedRestAmount) > 0.01) {
      throw new BadRequestException('Invalid restAmount: does not match amount - (platformFee + vendorFee)');
    }

    if (Math.abs(dto.tokensReceived - expectedTokensReceived) > 0.01) {
      throw new BadRequestException('Invalid tokensReceived: does not match restAmount * token rate');
    }
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

      // Validate fees provided by frontend
      // this.validateFees(dto);

      this.logger.log(`Creating token purchase for user ${userId}: $${dto.amount} -> ${dto.tokensReceived} tokens`);

      // Get success and cancel URLs from environment
      const successUrl = process.env.STRIPE_SUCCESS_URL as string;
      const cancelUrl = process.env.STRIPE_CANCEL_URL as string;

      // Create Stripe Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Token Purchase',
                description: `Purchase ${dto.tokensReceived} tokens`,
              },
              unit_amount: Math.round(dto.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          vendorId: dto.vendorId || '',
          type: 'token_purchase',
        },
        customer_email: user.email || undefined,
      });

      // Create token purchase record
      const tokenPurchase = await this.prisma.tokenPurchase.create({
        data: {
          userId,
          vendorId: dto.vendorId,
          amount: dto.amount,
          platformFee: dto.platformFee,
          vendorFee: dto.vendorFee,
          restAmount: dto.restAmount,
          tokensReceived: dto.tokensReceived,
          stripeCheckoutSessionId: session.id,
          status: 'pending',
        } as any, // Temporary workaround for Prisma client generation issue
      });

      return {
        id: tokenPurchase.id,
        amount: dto.amount,
        platformFee: dto.platformFee,
        vendorFee: dto.vendorFee,
        restAmount: dto.restAmount,
        tokensReceived: dto.tokensReceived,
        status: tokenPurchase.status,
        sessionUrl: session.url!,
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

      this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens purchased for user ${tokenPurchase.userId}`);

    } catch (error) {
      this.logger.error('Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Handle successful checkout session webhook
   */
  async handleCheckoutSessionCompleted(sessionId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripeCheckoutSessionId: sessionId } as any,
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for checkout session: ${sessionId}`);
        return;
      }

      this.logger.log(`Token purchase found: ${JSON.stringify({
        id: tokenPurchase.id,
        userId: tokenPurchase.userId,
        vendorId: tokenPurchase.vendorId,
        amount: tokenPurchase.amount,
        status: tokenPurchase.status
      })}`);

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

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: tokenPurchase.userId },
        select: { id: true, walletAddress: true },
      });

      if (!user || !user.walletAddress) {
        this.logger.error(`User ${tokenPurchase.userId} not found or no wallet address`);
        return;
      }

      // Get coin address
      let coinAddress: string | null = null;
      if (tokenPurchase.vendorId) {
        const vendorToken = await this.prisma.userToken.findFirst({
          where: { userId: tokenPurchase.vendorId },
          select: { tokenAddress: true },
        });
        if (vendorToken && vendorToken.tokenAddress) {
          coinAddress = vendorToken.tokenAddress;
        }
      }

      if (!coinAddress) {
        // Use default coin address if available
        coinAddress = process.env.DEFAULT_COIN_ADDRESS as string;
      }

      if (!coinAddress) {
        this.logger.error('No coin address available for purchase');
        return;
      }

      // Convert amount to wei (usdPaid)
      const usdPaid = ethers.parseEther(tokenPurchase.amount.toString());

      // Call buyFor on the smart contract
      const contract = this.tokenService.getContract();
      if (!contract) {
        this.logger.error('Smart contract not initialized');
        return;
      }

      try {
        const tx = await contract.buyFor(coinAddress, user.walletAddress, usdPaid);
        this.logger.log(`BuyFor transaction sent: ${tx.hash} for user ${tokenPurchase.userId}`);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        this.logger.log(`BuyFor transaction confirmed in block: ${receipt.blockNumber}`);

        // Follow the token owner if vendorId exists
        this.logger.log(`Checking follow logic - vendorId: ${tokenPurchase.vendorId}, userId: ${tokenPurchase.userId}`);
        if (tokenPurchase.vendorId && tokenPurchase.vendorId.trim() !== '') {
          this.logger.log(`Attempting to follow token owner ${tokenPurchase.vendorId} by user ${tokenPurchase.userId}`);
          try {
            await this.userService.followPerson(tokenPurchase.userId, tokenPurchase.vendorId);
            this.logger.log(`SUCCESS: User ${tokenPurchase.userId} followed token owner ${tokenPurchase.vendorId}`);
          } catch (followError) {
            // Check if it's just "already following" error, which is not a real failure
            if (followError.message && followError.message.includes('Already following')) {
              this.logger.log(`INFO: User ${tokenPurchase.userId} already follows token owner ${tokenPurchase.vendorId}`);
            } else {
              this.logger.error(`FAILED: Follow attempt failed: ${followError.message}`, followError.stack);
            }
          }
        } else {
          this.logger.log(`SKIP: No valid vendorId found (null or empty), skipping follow`);
        }
      } catch (blockchainError) {
        this.logger.error('Error calling buyFor on blockchain:', blockchainError);
      }

      this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens purchased for user ${tokenPurchase.userId}`);

    } catch (error) {
      this.logger.error('Error handling checkout session success:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session expired webhook
   */
  async handleCheckoutSessionExpired(sessionId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripeCheckoutSessionId: sessionId } as any,
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for checkout session: ${sessionId}`);
        return;
      }

      // Update status to expired
      await this.prisma.tokenPurchase.update({
        where: { id: tokenPurchase.id },
        data: {
          status: 'expired',
        },
      });

      this.logger.log(`Token purchase expired: ${tokenPurchase.id}`);

    } catch (error) {
      this.logger.error('Error handling checkout session expiration:', error);
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

  /**
   * Buy tokens using blockchain smart contract
   */
  async buyToken(buyerUserId: string, dto: BuyTokenDto) {
    try {
      // Get buyer user details
      const buyer = await this.prisma.user.findUnique({
        where: { id: buyerUserId },
        select: { id: true, walletAddress: true },
      });

      if (!buyer) {
        throw new BadRequestException('Buyer not found');
      }

      if (!buyer.walletAddress) {
        throw new BadRequestException('Buyer wallet address not found');
      }

      // Get token address from userToken table
      const userToken = await this.prisma.userToken.findFirst({
        where: { userId: dto.userId },
        select: { tokenAddress: true, tokenName: true },
      });

      if (!userToken || !userToken.tokenAddress) {
        throw new BadRequestException('Token not found for this user');
      }

      this.logger.log(`Buying token for user ${dto.userId}: ${userToken.tokenName} (${userToken.tokenAddress})`);

      // Convert USD amount to wei (assuming 1 USD = 1e18 wei for simplicity)
      const usdPaid = ethers.parseEther(dto.userPaid.toString());

      // Call the buyFor method on the smart contract
      const contract = this.tokenService.getContract();

      if (!contract) {
        throw new BadRequestException('Smart contract not initialized');
      }

      const tx = await contract.buyFor(
        userToken.tokenAddress,
        buyer.walletAddress,
        usdPaid
      );

      this.logger.log(`Transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: tx.hash,
        tokenAddress: userToken.tokenAddress,
        buyerAddress: buyer.walletAddress,
        usdPaid: dto.userPaid,
        blockNumber: receipt.blockNumber,
      };

    } catch (error) {
      this.logger.error('Error buying token:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to buy token: ${error.message}`);
    }
  }
}