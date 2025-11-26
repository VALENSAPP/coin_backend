import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  async ensureStripeCustomer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.stripeCustomerId) return user.stripeCustomerId;
    const customer = await this.stripe.customers.create({
      metadata: { userId },
      email: user.email || undefined,
    });
    await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
    return customer.id;
  }

  async createCheckoutSession(userId: string) {
    const customerId = await this.ensureStripeCustomer(userId);
    const priceId = process.env.STRIPE_PRICE_ID as string;
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;
    if (!priceId || !successUrl || !cancelUrl) {
      throw new BadRequestException('Missing STRIPE_PRICE_ID/STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: { userId },
    });
    return session;
  }

  async createOneTimePaymentCheckoutSession(userId: string, amount: number) {
    const customerId = await this.ensureStripeCustomer(userId);
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;
    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Following Payment',
            },
            unit_amount: amount * 100, // amount in cents
          },
          quantity: 1,
        },
      ],
      metadata: { userId, type: 'following', amount: amount.toString() },
    });
    return session;
  }

  async cancelSubscriptionAtPeriodEnd(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    let subscriptionId = user.stripeSubscriptionId || null;
    // Try to backfill subscription id if missing
    if (!subscriptionId && user.stripeCustomerId) {
      const list = await this.stripe.subscriptions.list({ customer: user.stripeCustomerId, status: 'active', limit: 1 });
      const activeSub = list.data[0];
      if (activeSub) {
        subscriptionId = activeSub.id;
        await this.prisma.user.update({ where: { id: userId }, data: { stripeSubscriptionId: subscriptionId } });
      }
    }
    if (!subscriptionId) throw new BadRequestException('No active subscription');
    const sub = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    await this.prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: 'CANCELED' } });
    return sub;
  }

  async getSubscriptionDetails(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    return {
      status: user.subscriptionStatus,
      start: user.subscriptionStart,
      end: user.subscriptionEnd,
      currentPeriodEnd: user.currentPeriodEnd,
    };
  }

  // Webhook handlers
  async handleInvoicePaid(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    const amount = invoice.amount_paid ?? 0;
    const currency = invoice.currency?.toUpperCase() ?? 'USD';
    const periodStart = invoice.lines.data[0]?.period?.start
      ? new Date(invoice.lines.data[0].period.start * 1000)
      : undefined;
    const periodEnd = invoice.lines.data[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000) : undefined;
    await this.prisma.payment.create({
      data: {
        userId: user.id,
        amount: amount,
        currency,
        status: 'succeeded',
        forPayment: 'subscription',
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id,
        periodStart,
        periodEnd,
      },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId ?? undefined,
        subscriptionStart: user.subscriptionStart ?? (periodStart || new Date()),
        subscriptionEnd: null,
        currentPeriodEnd: periodEnd,
      },
    });

    // Update user hits to 7 per month for subscription
    const postHit = await this.prisma.postHit.findFirst({
      where: { userId: user.id },
    });

    if (postHit) {
      await this.prisma.postHit.update({
        where: { id: postHit.id },
        data: { hitLeft: 2 },
      });
    } else {
      await this.prisma.postHit.create({
        data: {
          userId: user.id,
          hitLeft: 7,
        },
      });
    }
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;
    const currency = invoice.currency?.toUpperCase() ?? 'USD';
    await this.prisma.payment.create({
      data: {
        userId: user.id,
        amount: invoice.amount_due ?? 0,
        currency,
        status: 'failed',
        forPayment: 'subscription',
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id,
        periodStart: undefined,
        periodEnd: undefined,
      },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: 'PAST_DUE' } });
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    if (!customerId) return;
    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;
    const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'INACTIVE',
        subscriptionEnd: currentPeriodEnd,
        currentPeriodEnd: currentPeriodEnd,
        stripeSubscriptionId: null,
      },
    });
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!customerId || !subscriptionId) return;
    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripeSubscriptionId: subscriptionId },
    });
  }

  async handleOneTimePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
    if (!customerId) return;
    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;
    const amount = paymentIntent.amount ?? 0;
    const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
    await this.prisma.payment.create({
      data: {
        userId: user.id,
        amount: amount,
        currency,
        status: 'succeeded',
        forPayment: 'following',
        stripePaymentIntentId: paymentIntent.id,
      },
    });
  }

  async getLatestTransactions(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestWithdrawal(userId: string, amount: number) {
    console.log(`[WITHDRAWAL_REQUEST] User ${userId} requesting withdrawal of $${amount}`);

    if (amount < 10) {
      console.warn(`[WITHDRAWAL_REQUEST] User ${userId} failed: amount $${amount} below minimum $10`);
      throw new BadRequestException('Minimum withdrawal amount is $10');
    }

    // Use a transaction: check & decrement atomically + create withdrawal record
    const result = await this.prisma.$transaction(async (tx) => {
      // attempt to decrement only when balance is sufficient
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          tokenBalance: { gte: amount }, // atomic guard
        },
        data: {
          tokenBalance: { decrement: amount },
        },
      });

      if (updated.count === 0) {
        // no rows updated => insufficient funds or user not found
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.warn(`[WITHDRAWAL_REQUEST] User ${userId} not found`);
          throw new BadRequestException('User not found');
        }
        console.warn(`[WITHDRAWAL_REQUEST] User ${userId} failed: insufficient balance. Required: $${amount}, Available: $${user.tokenBalance}`);
        throw new BadRequestException('Insufficient balance');
      }

      const withdrawal = await tx.withdrawalRecord.create({
        data: {
          userId,
          withdrawAmount: amount,
          status: 'pending' as any,
        },
      });

      return withdrawal;
    });

    console.log(`[WITHDRAWAL_REQUEST] User ${userId} withdrawal ${result.id} created successfully for $${amount}`);

    return {
      message: 'Withdrawal request submitted successfully',
      withdrawalId: result.id,
      amount,
      status: 'pending',
    };
  }

  async getWithdrawalHistory(userId: string) {
    return this.prisma.withdrawalRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processWithdrawal(withdrawalId: string) {
    console.log(`[PROCESS_WITHDRAWAL] Starting processing for withdrawal ${withdrawalId}`);

    // Atomically claim the withdrawal: only move from pending -> processing if pending
    const claim = await this.prisma.withdrawalRecord.updateMany({
      where: { id: withdrawalId, status: 'pending' },
      data: { status: 'processing' as any, processingAt: new Date() } as any,
    });

    if (claim.count === 0) {
      console.warn(`[PROCESS_WITHDRAWAL] Withdrawal ${withdrawalId} not found or already processed`);
      // already processed / claimed
      throw new BadRequestException('Withdrawal not found or already processed');
    }

    console.log(`[PROCESS_WITHDRAWAL] Claimed withdrawal ${withdrawalId} for processing`);

    const withdrawal = await this.prisma.withdrawalRecord.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    // sanity check
    if (!withdrawal) throw new BadRequestException('Withdrawal not found');

    try {
      const user = withdrawal.user;

      // make sure connected account exists and is ready (KYC, transfers capability)
      if (!user.stripeAccountId) {
        console.warn(`[PROCESS_WITHDRAWAL] User ${user.id} needs Stripe Connect onboarding`);
        // Ideally onboarding happens earlier. If you create here, set status to requires_onboarding and return
        await this.prisma.withdrawalRecord.update({
          where: { id: withdrawalId },
          data: { status: 'requires_onboarding' as any, failureReason: 'no_stripe_account' as any } as any,
        });
        return { success: false, reason: 'user_needs_onboarding' };
      }

      // Check if account has transfers capability
      const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
      const transfersEnabled = (account.capabilities as any)?.transfers === 'active';

      if (!transfersEnabled) {
        console.warn(`[PROCESS_WITHDRAWAL] User ${user.id} Stripe account transfers not enabled`);
        await this.prisma.withdrawalRecord.update({
          where: { id: withdrawalId },
          data: { status: 'requires_onboarding' as any, failureReason: 'transfers_not_enabled' as any } as any,
        });
        return { success: false, reason: 'transfers_not_enabled' };
      }

      // Use platform-to-connected transfer pattern if you're collecting funds on platform
      const idempotencyKey = `withdrawal-${withdrawalId}-${withdrawal.withdrawAmount}`;

      // Example: transfer from platform to connected account
      const transfer = await this.stripe.transfers.create(
        {
          amount: Math.round((withdrawal.withdrawAmount ?? 0) * 100),
          currency: 'usd',
          destination: user.stripeAccountId,
          description: `Withdrawal transfer for user ${user.id}`,
        },
        { idempotencyKey }
      );

      // store external id and set status to processing_transfer
      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawalId },
        data: { txhash: transfer.id, status: 'processing_transfer' as any } as any,
      });

      console.log(`[PROCESS_WITHDRAWAL] Transfer created successfully for withdrawal ${withdrawalId}: ${transfer.id}`);

      // After transfer completes, Stripe will eventually payout to user's bank; use webhooks to observe payout events.

      return { success: true, transferId: transfer.id };
    } catch (err) {
      console.error(`[PROCESS_WITHDRAWAL] Error processing withdrawal ${withdrawalId}:`, err?.message ?? err);

      // mark failed and refund balance (idempotently)
      await this.prisma.$transaction(async (tx) => {
        await tx.withdrawalRecord.update({
          where: { id: withdrawalId },
          data: { status: 'failed' as any, failureReason: `${err?.message ?? 'unknown'}` as any } as any,
        });

        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { tokenBalance: { increment: withdrawal.withdrawAmount ?? 0 } },
        });
      });

      console.log(`[PROCESS_WITHDRAWAL] Withdrawal ${withdrawalId} marked as failed and balance refunded`);

      throw err;
    }
  }

  // Generate Stripe Connect onboarding link for user
  async createAccountOnboardingLink(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    let stripeAccountId = user.stripeAccountId;
    if (!stripeAccountId) {
      try {
        const account = await this.stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: user.email || undefined,
          capabilities: { transfers: { requested: true } },
        });

        stripeAccountId = account.id;

        await this.prisma.user.update({
          where: { id: userId },
          data: { stripeAccountId },
        });
      } catch (error: any) {
       console.error('Stripe error creating account:', {
    message: error.message,
    type: error.type,
    code: error.code,
    requestId: error.requestId,
    raw: error.raw,
  });
  throw error;
      }
    }

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/withdrawal/reauth`,
        return_url: `${process.env.FRONTEND_URL}/withdrawal/success`,
        type: 'account_onboarding',
      });

      return { onboardingUrl: accountLink.url };
    } catch (error: any) {
      console.error('Error creating account link:', error.message);
      throw new BadRequestException('Failed to create onboarding link. Please try again later.');
    }
  }

  // Handle payout success/failure webhooks
  async handlePayoutPaid(payout: Stripe.Payout) {
    // For transfers, we need to find the withdrawal by transfer ID, not payout ID
    // Payouts are created automatically by Stripe after transfer
    const withdrawal = await this.prisma.withdrawalRecord.findFirst({
      where: { txhash: payout.id },
    });

    if (withdrawal) {
      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: { status: 'success' as any } as any,
      });
    }
  }

  async handlePayoutFailed(payout: Stripe.Payout) {
    const withdrawal = await this.prisma.withdrawalRecord.findFirst({
      where: { txhash: payout.id },
    });

    if (withdrawal) {
      // Refund the amount back to user balance
      await this.prisma.user.update({
        where: { id: withdrawal.userId },
        data: {
          tokenBalance: {
            increment: withdrawal.withdrawAmount ?? 0,
          },
        },
      });

      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: { status: 'failed' as any } as any,
      });
    }
  }

  async handleTransferCreated(transfer: Stripe.Transfer) {
    // Find withdrawal by transfer ID
    const withdrawal = await this.prisma.withdrawalRecord.findFirst({
      where: { txhash: transfer.id },
    });

    if (withdrawal && withdrawal.status === 'processing_transfer') {
      // Transfer created successfully, now wait for payout
      // Status remains processing_transfer until payout.paid or payout.failed
      console.log(`Transfer created for withdrawal ${withdrawal.id}: ${transfer.id}`);
    }
  }

  async buyHit(amount: number, hitCount: number, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Buy ${hitCount} Hits`,
              description: `Purchase ${hitCount} additional hits for posting`,
            },
            unit_amount: amount * 100, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: process.env.STRIPE_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_CANCEL_URL!,
      metadata: {
        type: 'buy_hit',
        userId: userId,
        hitCount: hitCount.toString(),
      },
      customer_email: user.email || undefined,
    });

    // Create pending payment record
    await this.prisma.payment.create({
      data: {
        userId: userId,
        amount: amount,
        currency: 'USD',
        status: 'pending',
        forPayment: 'buyHit',
        stripePaymentIntentId: session.payment_intent as string,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async createFansPageSubscriptionCheckoutSession(userId: string) {
    const customerId = await this.ensureStripeCustomer(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // Get price details from Stripe
    const price = await this.stripe.prices.retrieve('price_1STKIwEfZnDK6m7OP2vahCdr');
    const amount = price.unit_amount || 0;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Fans Page Subscription',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: process.env.STRIPE_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_CANCEL_URL!,
      metadata: {
        type: 'fans_page_subscription',
        userId: userId,
      },
    });

    // Create pending payment record
    await this.prisma.payment.create({
      data: {
        userId: userId,
        amount: amount,
        currency: 'USD',
        status: 'pending',
        forPayment: 'fanSubscription',
        stripePaymentIntentId: session.payment_intent as string,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleFansPageSubscriptionPayment(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error('Missing userId in fans_page_subscription session metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(`User ${userId} not found for fans_page_subscription payment`);
      return;
    }

    // Update the existing pending payment record to success
    const paymentIntentId = session.payment_intent as string;
    await this.prisma.payment.updateMany({
      where: {
        userId: userId,
        stripePaymentIntentId: paymentIntentId,
        forPayment: 'fanSubscription',
        status: 'pending'
      },
      data: {
        status: 'succeeded',
        amount: session.amount_total || 0,
        currency: session.currency?.toUpperCase() || 'USD',
      },
    });

    // Update user fansPage to 1
    await this.prisma.user.update({
      where: { id: userId },
      data: { fansPage: 1 } as any,
    });

    console.log(`✅ Fans page subscription payment processed: User ${userId} fansPage set to 1`);
  }

  async handleFanSubscriptionBuyPayment(session: Stripe.Checkout.Session) {
    const fanUserId = session.metadata?.fanUserId;
    const buyUserId = session.metadata?.buyUserId;

    if (!fanUserId || !buyUserId) {
      console.error('Missing fanUserId or buyUserId in fan_subscription_buy session metadata');
      return;
    }

    const fanUser = await this.prisma.user.findUnique({ where: { id: fanUserId } });
    if (!fanUser) {
      console.error(`Fan user ${fanUserId} not found for fan_subscription_buy payment`);
      return;
    }

    // Update the existing pending payment record to success
    const paymentIntentId = session.payment_intent as string;
    await this.prisma.payment.updateMany({
      where: {
        userId: buyUserId,
        stripePaymentIntentId: paymentIntentId,
        forPayment: 'fanSubscriptionBuy',
        status: 'pending'
      },
      data: {
        status: 'succeeded',
        amount: session.amount_total || 0,
        currency: session.currency?.toUpperCase() || 'USD',
      },
    });

    // Create FansSubscriptionBuyData entry
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // Add 30 days (approximately one month)

    await this.prisma.fansSubscriptionBuyData.create({
      data: {
        fanUserId,
        buyUserId,
        startDate,
        endDate,
        status: 'ACTIVE',
      },
    });
await this.prisma.user.update({ 
   where: {
        id: fanUserId
      },
      data: {
        tokenBalance: session.amount_total || 0
      },
    });
    console.log(`✅ Fan subscription buy payment processed: Fan ${fanUserId} subscribed to ${buyUserId} for one month`);
  }

  async createOneTimePaymentCheckForFanSubscription(amount: number, buyUserId: string, fanUserId: string) {
    const customerId = await this.ensureStripeCustomer(fanUserId);
    const buyUser = await this.prisma.user.findUnique({ where: { id: buyUserId } });
    if (!buyUser) throw new BadRequestException('Buy user not found');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      success_url: process.env.STRIPE_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_CANCEL_URL!,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Fan Subscription to ${buyUser.displayName || buyUser.userName}`,
            },
            unit_amount: amount * 100, // Amount in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'fan_subscription_buy',
        fanUserId,
        buyUserId,
        amount: amount.toString(),
      },
    });

    // Create pending payment record
    await this.prisma.payment.create({
      data: {
        userId: buyUserId,
        amount: amount,
        currency: 'USD',
        status: 'pending',
        forPayment: 'fanSubscriptionBuy',
        stripePaymentIntentId: session.payment_intent as string,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleBuyHitPayment(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const hitCount = parseInt(session.metadata?.hitCount || '0');

    if (!userId || !hitCount) {
      console.error('Missing userId or hitCount in buy_hit session metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(`User ${userId} not found for buy_hit payment`);
      return;
    }

    // Update the existing pending payment record to success
    const paymentIntentId = session.payment_intent as string;
    await this.prisma.payment.updateMany({
      where: {
        userId: userId,
        stripePaymentIntentId: paymentIntentId,
        forPayment: 'buyHit',
        status: 'pending'
      },
      data: {
        status: 'succeeded',
        amount: session.amount_total || 0,
        currency: session.currency?.toUpperCase() || 'USD',
      },
    });

    // Update or create postHit record with purchased hits
    const existingPostHit = await this.prisma.postHit.findFirst({
      where: { userId: userId },
    });

    if (existingPostHit) {
      // Add purchased hits to existing hits
      await this.prisma.postHit.update({
        where: { id: existingPostHit.id },
        data: {
          hitLeft: {
            increment: hitCount
          }
        },
      });
    } else {
      // Create new postHit record
      await this.prisma.postHit.create({
        data: {
          userId: userId,
          hitLeft: hitCount,
        },
      });
    }

    console.log(`✅ Buy hit payment processed: User ${userId} received ${hitCount} hits`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingWithdrawals() {
    console.log('[CRON] Processing pending withdrawals...');

    const pendingWithdrawals = await this.prisma.withdrawalRecord.findMany({
      where: { status: 'pending' },
      select: { id: true },
    });

    if (pendingWithdrawals.length === 0) {
      console.log('[CRON] No pending withdrawals to process');
      return;
    }

    console.log(`[CRON] Found ${pendingWithdrawals.length} pending withdrawals to process`);

    for (const withdrawal of pendingWithdrawals) {
      try {
        await this.processWithdrawal(withdrawal.id);
        console.log(`[CRON] Successfully processed withdrawal ${withdrawal.id}`);
      } catch (error) {
        console.error(`[CRON] Failed to process withdrawal ${withdrawal.id}:`, error.message);
        // Continue processing other withdrawals even if one fails
      }
    }

    console.log('[CRON] Finished processing pending withdrawals');
  }

  async getUserBuyFanSubscriptionList(userId: string) {
    return this.prisma.fansSubscriptionBuyData.findMany({
      where: { buyUserId: userId },
      include: {
        fanUser: {
          select: { userName: true, image: true }
        }
      }
    });
  }

  async fanSubscriptionUserList(userId: string) {
    return this.prisma.fansSubscriptionBuyData.findMany({
      where: { fanUserId: userId },
      include: {
        buyUser: {
          select: { id: true, userName: true, image: true }
        }
      }
    });
  }

  async userTransactionHistory(userId: string, transactionType: string) {
    if (transactionType === 'all') {
      const [withdrawals, tokenSales, tokenPurchases, payments] = await Promise.all([
        this.prisma.withdrawalRecord.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.tokenSale.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.tokenPurchase.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.payment.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const allTransactions = [
        ...withdrawals.map(w => ({ ...w, typeTransaction: 'withdrawal' })),
        ...tokenSales.map(ts => ({ ...ts, typeTransaction: 'tokenSale' })),
        ...tokenPurchases.map(tp => ({ ...tp, typeTransaction: 'tokenPurchase' })),
        ...payments.map(p => ({ ...p, typeTransaction: 'payment' }))
      ];

      return allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      switch (transactionType) {
        case 'withdrawal':
          return this.prisma.withdrawalRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
          });
        case 'tokenSale':
          return this.prisma.tokenSale.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
          });
        case 'tokenPurchase':
          return this.prisma.tokenPurchase.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
          });
        case 'payment':
          return this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
          });
        default:
          throw new BadRequestException('Invalid transaction type');
      }
    }
  }
}


