import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto, SellTokenDto, DonationResponseDto, MissionDonationDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import Stripe from 'stripe';
import { ethers } from 'ethers';
import { decryptSecret } from '../common/crypto.util';

@Injectable()
export class TokenPurchaseService {
  private readonly logger = new Logger(TokenPurchaseService.name);
  private stripe: Stripe;

  private readonly TOKEN_RATE = 100; // 1 USD = 100 tokens
  /** Platform fee for mission donation: 5% to platform, 95% to vendor (Stripe Connect). */
  private readonly PLATFORM_FEE_PERCENT = 0.05;

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  /**
   * Returns vendor's Stripe Connect account id if they can receive payments. Throws otherwise.
   * Same logic as pay-following: vendor must have completed Connect onboarding.
   */
  private async getVendorConnectAccountId(vendorId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: vendorId } });
    if (!user) {
      throw new BadRequestException('Vendor not found');
    }
    if (!user.stripeAccountId) {
      throw new BadRequestException(
        'Vendor must complete Stripe Connect onboarding to receive mission donations. Call POST /billing/create-onboarding-link first.',
      );
    }
    const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.details_submitted) {
      throw new BadRequestException(
        'Vendor must finish Stripe onboarding (identity and bank details) before receiving mission donations.',
      );
    }
    return user.stripeAccountId;
  }

  private async getMissionPostOrThrow(postId: string, vendorId: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        userId: vendorId,
        deletedAt: null,
        isDelete: 'no',
        postHide: 'no',
        type: { in: ['crowdfunding', 'support'] },
      },
      select: {
        id: true,
        start_time: true,
        end_time: true,
      },
    });

    if (!post) {
      throw new BadRequestException('Mission post not found for this vendor');
    }

    if (!post.start_time || !post.end_time) {
      throw new BadRequestException('Mission post timeline is not configured correctly');
    }

    return post;
  }

  /** @deprecated Valens does not display token amounts/prices or tie engagement to token activity. */
  async getTotalTokenData(userId: string) {
    return [];
    // Original implementation commented: no token pricing/balance display per Valens requirements.
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

      let productName: string;
      let productDescription: string;
      let metadataType: string;

      if (dto.type === 'token_purchase') {
        // Valens: token purchase excluded. Revenue from software/Stripe only, not token activity.
        throw new BadRequestException(
          'Token purchase is not available. Valens does not issue, sell, or settle tokens. Revenue is from software services (e.g. subscriptions) via Stripe only.'
        );
      } else if (dto.type === 'donation') {
        productName = 'Donation';
        productDescription = `Donate $${dto.amount}`;
        metadataType = 'donation';
        this.logger.log(`Creating donation for user ${userId}: $${dto.amount}`);
      } else {
        throw new BadRequestException('Invalid type');
      }

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
                name: productName,
                description: productDescription,
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
          type: metadataType,
        },
        customer_email: user.email || undefined,
      });

      // Create payment record for tracking (token_purchase branch throws above, so only donation reaches here)
      const paymentData: any = {
        userId,
        amount: Math.round(dto.amount * 100), // Store in cents
        currency: 'usd',
        stripePaymentIntentId: session.id, // Using session id
        status: 'pending',
        forPayment: 'donation',
      };

      await this.prisma.payment.create({
        data: paymentData,
      });

      let record: any;
      let response: any;

      if (dto.type === 'donation') {
        // Create donation record
        const donationData: any = {
          userId,
          vendorId: dto.vendorId,
          postId: dto.postId,
          amount: dto.amount,
          stripeCheckoutSessionId: session.id,
          status: 'pending',
        };

        // Only include purchaseTokenPrice if it's provided
        if (dto.purchaseTokenPrice !== undefined) {
          donationData.purchaseTokenPrice = dto.purchaseTokenPrice;
        }

        record = await this.prisma.donationData.create({
          data: donationData,
        });

        response = {
          id: record.id,
          amount: dto.amount,
          status: record.status,
          sessionUrl: session.url!,
        };

        // Only include purchaseTokenPrice in response if it was provided
        if (dto.purchaseTokenPrice !== undefined) {
          response.purchaseTokenPrice = dto.purchaseTokenPrice;
        }
      } else {
        throw new BadRequestException('Invalid type');
      }

      return response;

    } catch (error) {
      this.logger.error('Error creating purchase:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create purchase');
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

      // Update payment status
      await this.prisma.payment.updateMany({
        where: {
          userId: tokenPurchase.userId,
          stripePaymentIntentId: sessionId,
          status: 'pending',
          forPayment: 'tokenPurchase',
        },
        data: {
          status: 'completed',
        },
      });

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

      if (!user) {
        this.logger.error(`User ${tokenPurchase.userId} not found`);
        return;
      }
      // Valens: no blockchain token purchase; coin address / buyToken / token-based follow skipped.
      // if (!tokenPurchase.vendorId) { ... }
      // const buyResult = await this.buyToken(...);
      // await this.userService.followPerson(...);
      this.logger.log(`Token purchase record ${tokenPurchase.id} completed (blockchain/token flow disabled per Valens requirements).`);

      // Send push notification to the user
      try {
        await this.notificationService.sendNotificationToUser(
          tokenPurchase.userId,
          'Token Purchase Successful',
          `Congratulations! You have successfully purchased ${tokenPurchase.tokensReceived} tokens.`,
          { type: 'token_purchase', purchaseId: tokenPurchase.id }
        );
      } catch (notificationError) {
        this.logger.error('Failed to send push notification:', notificationError);
      }

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

  /** @deprecated Valens does not maintain internal token balances. */
  async getUserTokenBalance(userId: string): Promise<number> {
    return 0;
    // Valens: no internal balances per requirements.
  }

  /** @deprecated Valens does not tie engagement to token amounts. */
  async getVendorTokenAmount(userId: string, vendorId: string): Promise<number> {
    return 0;
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

  /** @deprecated Valens does not display token purchase/sale history or balances. */
  async getUserTokenHistory(userId: string, tokenAddress?: string, period?: 'week' | 'month' | 'year') {
    return {
      tokenAddress: tokenAddress || null,
      period: period || null,
      totalTransactions: 0,
      currentBalance: 0,
      history: [],
    };
  }

  /** @deprecated Valens does not buy/sell tokens or interact with DEX. */
  async buyToken(buyerUserId: string, dto: BuyTokenDto) {
    throw new BadRequestException(
      'Token purchase is not available. Valens does not issue, sell, or settle tokens.'
    );
  }

  /** @deprecated Valens does not rank by token purchases or display token status. */
  async getTopCreators() {
    return [];
    // Top creators by token price excluded per Valens requirements.
  }

  /** @deprecated Valens does not sell tokens or interact with DEX. */
  async sellToken(sellerUserId: string, dto: SellTokenDto) {
    throw new BadRequestException(
      'Token sale is not available. Valens does not issue, sell, or settle tokens.'
    );
  }

  async handleDonationPayment(session: Stripe.Checkout.Session) {
    try {
      const userId = session.metadata?.userId;
      const vendorId = session.metadata?.vendorId;

      if (!userId) {
        this.logger.error('Missing userId in donation session metadata');
        return;
      }

      // Update payment status
      await this.prisma.payment.updateMany({
        where: {
          userId,
          stripePaymentIntentId: session.id,
          status: 'pending',
          forPayment: 'donation',
        },
        data: {
          status: 'completed',
        },
      });

      // Update donation status to completed
      const updateResult = await this.prisma.donationData.updateMany({
        where: {
          userId,
          stripeCheckoutSessionId: session.id,
          status: 'pending',
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        this.logger.warn(`No pending donation found for session ${session.id}`);
        return;
      }

      this.logger.log(`Donation for session ${session.id} completed successfully`);
    } catch (error) {
      this.logger.error('Error handling donation payment:', error);
    }
  }

  async handleMissionDonationPayment(session: Stripe.Checkout.Session) {
    try {
      const userId = session.metadata?.userId;
      const vendorId = session.metadata?.vendorId;

      if (!userId) {
        this.logger.error('Missing userId in mission donation session metadata');
        return;
      }

      // Update payment status to completed
      const paymentUpdateResult = await this.prisma.payment.updateMany({
        where: {
          userId,
          stripePaymentIntentId: session.id,
          status: 'pending',
          forPayment: 'missionDonation',
        },
        data: {
          status: 'completed',
        },
      });

      // Update mission donation status to completed
      const donationUpdateResult = await this.prisma.donationData.updateMany({
        where: {
          userId,
          stripeCheckoutSessionId: session.id,
          status: 'pending',
          action: 'missionDonation',
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      if (paymentUpdateResult.count === 0 && donationUpdateResult.count === 0) {
        this.logger.warn(`No pending mission donation records found for session ${session.id}`);
        return;
      }

      const completedDonation = await this.prisma.donationData.findFirst({
        where: {
          userId,
          stripeCheckoutSessionId: session.id,
          status: 'completed',
          action: 'missionDonation',
        },
        select: { id: true, postId: true },
      });

      if (completedDonation?.postId) {
        try {
          await this.notificationService.sendMissionContributionConfirmed(completedDonation.id);
          await this.notificationService.sendNewMissionBackerNotification(completedDonation.id);
          await this.notificationService.sendMissionGoalMilestoneIfNeeded(completedDonation.postId);
          await this.notificationService.sendMissionFullyFundedIfNeeded(completedDonation.postId);
        } catch (notificationError) {
          this.logger.error('Failed to send mission donation notification:', notificationError);
        }
      }

      this.logger.log(`Mission donation for session ${session.id} completed successfully`);
    } catch (error) {
      this.logger.error('Error handling mission donation payment:', error);
    }
  }

  async getPostDonationTotal(postId: string): Promise<{ totalDonation: number }> {
    try {
      // Aggregate the total donation amount for the post
      const donations = await this.prisma.donationData.findMany({
        where: {
          postId,
          status: 'completed', // Only count completed donations
        },
        select: {
          amount: true,
          totalAmount: true,
        },
      });

      const totalDonation = donations.reduce(
        (sum, donation) => sum + Number(donation.totalAmount ?? donation.amount ?? 0),
        0,
      );

      this.logger.log(`Total donation for post ${postId}: $${totalDonation}`);

      return { totalDonation };
    } catch (error) {
      this.logger.error('Error getting post donation total:', error);
      throw new BadRequestException('Failed to get post donation total');
    }
  }

  async getMissionDonationReceivedSummary(vendorId: string, page: number = 1, pageSize: number = 10) {
    const safePage = Math.max(1, page || 1);
    const safePageSize = Math.min(Math.max(1, pageSize || 10), 50);
    const skip = (safePage - 1) * safePageSize;
    const where = {
      vendorId,
      status: 'completed',
      action: { in: ['missionDonation', 'donate'] },
    };

    const now = new Date();

    const [sumResult, transactions, activePostCount] = await Promise.all([
      this.prisma.donationData.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.donationData.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePageSize,
      }),
      this.prisma.post.count({
        where: {
          userId: vendorId,
          deletedAt: null,
          isDelete: 'no',
          postHide: 'no',
          type: { in: ['crowdfunding', 'support'] },
          start_time: { lte: now },
          end_time: { gte: now },
        },
      }),
    ]);

    return {
      totalAmount: sumResult._sum?.amount ?? 0,
      activePostCount,
      transactions,
    };
  }

  async missionPostDonation(userId: string, dto: MissionDonationDto): Promise<DonationResponseDto> {
    try {
      // Validate payer exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });
// console.log('Mission donation - payer user:', user, 'note:', dto.note);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Keep donation checks simple: allow only during active mission window.
      const missionPost = await this.getMissionPostOrThrow(dto.postId, dto.vendorId);
      const now = new Date();
      if (missionPost.start_time! > now) {
        throw new BadRequestException('Mission has not started yet');
      }
      if (missionPost.end_time! <= now) {
        throw new BadRequestException('Mission is closed because deadline has passed');
      }

      // Vendor (recipient of 95%) must exist and have Stripe Connect ready
      const destinationAccountId = await this.getVendorConnectAccountId(dto.vendorId);

      const productName = 'Mission Donation';
      const productDescription = `Donate $${dto.amount} to mission`;
      const metadataType = 'MissionDonation';
      const amountCents = Math.round(dto.amount * 100);
      const applicationFeeCents = Math.round(amountCents * this.PLATFORM_FEE_PERCENT);
      const receiverAmountCents = Math.max(0, amountCents - applicationFeeCents);
      const totalAmount = this.roundCurrency(amountCents / 100);
      const platformFees = this.roundCurrency(applicationFeeCents / 100);
      const receiverAmount = this.roundCurrency(receiverAmountCents / 100);

      this.logger.log(`Creating mission donation for user ${userId}: $${dto.amount} (5% platform, 95% to vendor ${dto.vendorId})`);

      // Get success and cancel URLs from environment
      const successUrl = process.env.STRIPE_SUCCESS_URL as string;
      const cancelUrl = process.env.STRIPE_CANCEL_URL as string;

      // Create Stripe Checkout Session with 5% platform fee, 95% to vendor (destination charge)
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: productName,
                description: productDescription,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_intent_data: {
          application_fee_amount: applicationFeeCents,
          transfer_data: { destination: destinationAccountId },
          metadata: {
            userId,
            vendorId: dto.vendorId,
            type: metadataType,
          },
        },
        metadata: {
          userId,
          vendorId: dto.vendorId,
          type: metadataType,
        },
        customer_email: user.email || undefined,
      });

      // Create payment record (same as before)
      const paymentData: any = {
        userId,
        receiverId: dto.vendorId,
        amount: receiverAmountCents,
        platformFee: applicationFeeCents,
        totalAmount: amountCents,
        currency: 'usd',
        stripePaymentIntentId: session.id,
        status: 'pending',
        forPayment: 'missionDonation'
      };

      await this.prisma.payment.create({
        data: paymentData,
      });

      // Create donation record (same as before)
      const donationData: any = {
        userId,
        vendorId: dto.vendorId,
        postId: dto.postId,
        amount: receiverAmount,
        totalAmount,
        platformFees,
        stripeCheckoutSessionId: session.id,
        status: 'pending',
        action: 'missionDonation',
        note: dto.note, // Optional note for the donation
      };

      const donationRecord = await this.prisma.donationData.create({
        data: donationData,
      });

      return {
        id: donationRecord.id,
        amount: donationRecord.amount,
        totalAmount: donationRecord.totalAmount ?? totalAmount,
        platformFees: donationRecord.platformFees ?? platformFees,
        status: donationRecord.status,
        sessionUrl: session.url!,
      };
    } catch (error) {
      this.logger.error('Error creating mission donation:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create mission donation');
    }
  }
}
