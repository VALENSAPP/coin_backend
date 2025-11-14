import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

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

  async requestWithdrawal(userId: string, amount: number, bankDetails: any) {
    // Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // Check if user has sufficient balance
    if (user.tokenBalance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Check minimum withdrawal amount (e.g., $10)
    if (amount < 10) {
      throw new BadRequestException('Minimum withdrawal amount is $10');
    }

    // Create withdrawal record
    const withdrawal = await this.prisma.withdrawalRecord.create({
      data: {
        userId,
        withdrawAmount: amount,
        status: 'pending',
      },
    });

    // Update user balance (deduct the amount)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenBalance: {
          decrement: amount,
        },
      },
    });

    return {
      message: 'Withdrawal request submitted successfully',
      withdrawalId: withdrawal.id,
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

  // Process withdrawal via Stripe Connect (to be called by admin or cron job)
  async processWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawalRecord.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) throw new BadRequestException('Withdrawal not found');
    if (withdrawal.status !== 'pending') throw new BadRequestException('Withdrawal already processed');

    try {
      const user = withdrawal.user;

      // 1. Ensure user has a connected Stripe account
      let stripeAccountId = user.stripeAccountId;
      if (!stripeAccountId) {
        const account = await this.stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: user.email || undefined,
          capabilities: { transfers: { requested: true } },
        });

        stripeAccountId = account.id;

        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripeAccountId },
        });
      }

      // 2. Attach bank account to connected account (only if not already attached)
      if (!user.stripeBankAccountId) {
        // Create bank account token (in production, collect from user securely)
        const bankToken = await this.stripe.tokens.create({
          bank_account: {
            country: 'US',
            currency: 'usd',
            account_holder_type: 'individual',
            routing_number: '110000000', // Test routing number
            account_number: '000123456789', // Test account number
          },
        });

        // Attach bank account to connected account
        const bankAccount = await this.stripe.accounts.createExternalAccount(stripeAccountId, {
          external_account: bankToken.id,
        });

        // Store bank account ID to avoid re-creating
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            stripeBankAccountId: bankAccount.id,
          },
        });
      }

      // 3. Create payout from connected account
      const payout = await this.stripe.payouts.create(
        {
          amount: Math.round((withdrawal.withdrawAmount ?? 0) * 100), // Convert to cents
          currency: 'usd',
          description: `Withdrawal for user ${withdrawal.userId}`,
        },
        { stripeAccount: stripeAccountId }, // Key: payout from connected account
      );

      // Update withdrawal status
      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawalId },
        data: {
          status: 'processing',
          txhash: payout.id,
        },
      });

      return { success: true, payoutId: payout.id };
    } catch (error) {
      console.error('Withdrawal failed:', JSON.stringify(error, null, 2));

      // Refund the balance back to user
      await this.prisma.user.update({
        where: { id: withdrawal.userId },
        data: {
          tokenBalance: {
            increment: withdrawal.withdrawAmount ?? 0,
          },
        },
      });

      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawalId },
        data: { status: 'failed' },
      });

      throw error;
    }
  }

  // Generate Stripe Connect onboarding link for user
  async createAccountOnboardingLink(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    let stripeAccountId = user.stripeAccountId;
    if (!stripeAccountId) {
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
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/withdrawal/reauth`,
      return_url: `${process.env.FRONTEND_URL}/withdrawal/success`,
      type: 'account_onboarding',
    });

    return { onboardingUrl: accountLink.url };
  }

  // Handle payout success/failure webhooks
  async handlePayoutPaid(payout: Stripe.Payout) {
    const withdrawal = await this.prisma.withdrawalRecord.findFirst({
      where: { txhash: payout.id },
    });

    if (withdrawal) {
      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: { status: 'success' },
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
        data: { status: 'failed' },
      });
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1STKIwEfZnDK6m7OP2vahCdr',
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
      customer_email: user.email || undefined,
    });

    // Create pending payment record
    await this.prisma.payment.create({
      data: {
        userId: userId,
        amount: session.amount_total || 0,
        currency: session.currency?.toUpperCase() || 'USD',
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
      data: { fansPage: 1 },
    });

    console.log(`✅ Fans page subscription payment processed: User ${userId} fansPage set to 1`);
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
}


