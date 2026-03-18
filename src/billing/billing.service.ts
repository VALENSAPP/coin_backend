import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import Stripe from 'stripe';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BillingService {
  private stripe: Stripe;
  private readonly usdtInterface = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  private getRpcUrlForChain(chain: string): string {
    const normalized = chain.toUpperCase();
    const mapping: Record<string, string | undefined> = {
      POLYGON: process.env.POLYGON_RPC_URL,
    };
    return mapping[normalized] || '';
  }

  private getUsdtAddressForChain(chain: string): string {
    const normalized = chain.toUpperCase();
    const mapping: Record<string, string | undefined> = {
      POLYGON: process.env.USDT_ADDRESS_POLYGON || '0xc2132D05D31c914a87C6611C10748AaCB3b14dD6',
    };
    return mapping[normalized] || '';
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
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profile: true } });
    if (!user) throw new BadRequestException('User not found');
    const isCompany = (user.profile || '').toLowerCase() === 'company';
    const priceId = (isCompany ? process.env.STRIPE_PRICE_ID_Business : process.env.STRIPE_PRICE_ID) as string;
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;
    if (!priceId || !successUrl || !cancelUrl) {
      throw new BadRequestException(
        'Missing STRIPE_PRICE_ID/STRIPE_PRICE_ID_Business/STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars',
      );
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

  /** Platform fee: Valens keeps 5%, rest goes to creator's Stripe Connect account (no holding). */
  private readonly PLATFORM_FEE_PERCENT = 0.05;

  /** Check if user has completed Stripe Connect onboarding and can receive payments. */
  async getOnboardingStatus(userId: string): Promise<{
    canReceivePayments: boolean;
    onboardingUrl?: string;
    accountId?: string;
    message?: string;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!user.stripeAccountId) {
      return {
        canReceivePayments: false,
        message: 'Complete Stripe onboarding to receive payments.',
      };
    }
    try {
      const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
      const canReceive = !!(account.details_submitted && account.payouts_enabled !== false);
      return {
        canReceivePayments: canReceive,
        accountId: user.stripeAccountId,
        message: canReceive ? undefined : 'Finish onboarding (e.g. add bank account) to receive payments.',
      };
    } catch {
      return { canReceivePayments: false, accountId: user.stripeAccountId, message: 'Stripe account not ready.' };
    }
  }

  /** Throws if user cannot receive payments (onboarding required). */
  private async requireCanReceivePayments(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!user.stripeAccountId) {
      throw new BadRequestException(
        'Complete Stripe onboarding before receiving payments. Call POST /billing/create-onboarding-link first.',
      );
    }
    const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.details_submitted) {
      throw new BadRequestException(
        'Finish Stripe onboarding (identity and bank details) before receiving payments.',
      );
    }
    return user.stripeAccountId;
  }

  async createOneTimePaymentCheckoutSession(
    payerUserId: string,
    contentUserId: string,
    amount: number,
  ) {
    const destinationAccountId = await this.requireCanReceivePayments(contentUserId);
    const customerId = await this.ensureStripeCustomer(payerUserId);
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;
    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
    }
    const amountCents = Math.round(amount * 100);
    const applicationFeeCents = Math.round(amountCents * this.PLATFORM_FEE_PERCENT);
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
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: destinationAccountId },
        metadata: {
          payerUserId,
          contentUserId,
          type: 'following',
          amount: amount.toString(),
        },
      },
      metadata: {
        payerUserId,
        contentUserId,
        type: 'following',
        amount: amount.toString(),
      },
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
    // eslint-disable-next-line no-console
    console.log('[Billing] handleOneTimePaymentSuccess — paymentIntentId:', paymentIntent.id);
    const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
    if (!customerId) {
      console.warn('[Billing] handleOneTimePaymentSuccess — no customerId on PaymentIntent, skipping');
      return;
    }
    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) {
      console.warn('[Billing] handleOneTimePaymentSuccess — no user found for customerId:', customerId);
      return;
    }
    const amountCents = paymentIntent.amount ?? 0;
    const amountInDollars = Math.round(amountCents / 100);
    const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
    const contentUserId = paymentIntent.metadata?.contentUserId;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const payment = await this.prisma.payment.create({
      data: {
        user: { connect: { id: user.id } },
        ...(contentUserId && { receiver: { connect: { id: contentUserId } } }),
        amount: amountInDollars,
        currency,
        status: 'succeeded',
        forPayment: 'following',
        stripePaymentIntentId: paymentIntent.id,
        periodStart,
        periodEnd,
      },
    });
    // eslint-disable-next-line no-console
    console.log('[Billing] Payment created (pay-following success): id=', payment.id, 'userId=', user.id, 'receiverId=', contentUserId ?? 'none', 'amount(USD)=', amountInDollars, 'status=succeeded');
  }

  async handleOneTimePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    // eslint-disable-next-line no-console
    console.log('[Billing] handleOneTimePaymentFailed — paymentIntentId:', paymentIntent.id);
    const existing = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id, forPayment: 'following' },
    });
    if (existing) {
      await this.prisma.payment.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
      // eslint-disable-next-line no-console
      console.log('[Billing] Payment updated to failed (pay-following): id=', existing.id);
      return;
    }
    const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
    if (!customerId) {
      console.warn('[Billing] handleOneTimePaymentFailed — no customerId on PaymentIntent, skipping');
      return;
    }
    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) {
      console.warn('[Billing] handleOneTimePaymentFailed — no user found for customerId:', customerId);
      return;
    }
    const amountCents = paymentIntent.amount ?? 0;
    const amountInDollars = Math.round(amountCents / 100);
    const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
    const contentUserId = paymentIntent.metadata?.contentUserId;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const payment = await this.prisma.payment.create({
      data: {
        user: { connect: { id: user.id } },
        ...(contentUserId && { receiver: { connect: { id: contentUserId } } }),
        amount: amountInDollars,
        currency,
        status: 'failed',
        forPayment: 'following',
        stripePaymentIntentId: paymentIntent.id,
        periodStart,
        periodEnd,
      },
    });
    // eslint-disable-next-line no-console
    console.log('[Billing] Payment created (pay-following failed): id=', payment.id, 'userId=', user.id, 'receiverId=', contentUserId ?? 'none', 'amount(USD)=', amountInDollars, 'status=failed');
  }

  async getLatestTransactions(userId: string, limit: number = 50) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 100),
    });
  }

  /**
   * Get fan subscription status: whether the current user (payer) has an active pay-following
   * to the given receiver (creator). Uses latest succeeded payment and periodEnd.
   */
  async getFanSubscriptionStatus(userId: string, receiverId: string): Promise<{ status: 'Active' | 'Inactive' }> {
    const latest = await this.prisma.payment.findFirst({
      where: {
        userId,
        receiverId,
        forPayment: 'following',
        status: 'succeeded',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest || !latest.periodEnd) {
      return { status: 'Inactive' };
    }
    const now = new Date();
    return { status: latest.periodEnd > now ? 'Active' : 'Inactive' };
  }

  /** @deprecated Valens does not offer withdrawals or redemptions. */
  async requestWithdrawal(userId: string, amount: number) {
    throw new BadRequestException(
      'Withdrawals are not available. Valens does not manage liquidity or withdrawals.'
    );
  }

  async getWithdrawalHistory(userId: string) {
    return this.prisma.withdrawalRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** @deprecated Valens does not process withdrawals. */
  async processWithdrawal(withdrawalId: string) {
    return; // No-op: withdrawals disabled per Valens requirements
  }

  // Generate Stripe Connect onboarding link for user.
  // We create and persist stripeAccountId on first link request. If the user closes the
  // onboarding URL without completing, we keep the same account and issue a new link
  // next time (links expire ~30 min). Payments are only allowed when onboarding is
  // complete (requireCanReceivePayments checks details_submitted).
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
      // Use backend URL so Stripe redirects to our success page (GET /withdrawal/success). Set to your API base, e.g. https://api.valenscorp.com
      const baseUrl = (process.env.STRIPE_CONNECT_RETURN_BASE_URL || process.env.BACKEND_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
      if (!baseUrl) {
        throw new BadRequestException(
          'Set STRIPE_CONNECT_RETURN_BASE_URL, BACKEND_URL, or FRONTEND_URL so Stripe can redirect after onboarding.',
        );
      }
      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/withdrawal/reauth`,
        return_url: `${baseUrl}/withdrawal/success`,
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

      // Send notification to the user
      try {
        await this.notificationService.sendNotificationToUser(
          withdrawal.userId,
          'Withdrawal Successful',
          `Your withdrawal of $${withdrawal.withdrawAmount} has been processed successfully.`,
          { type: 'withdrawal_success', withdrawalId: withdrawal.id, amount: (withdrawal.withdrawAmount || 0).toString() }
        );
      } catch (notificationError) {
        console.error('Failed to send withdrawal success notification:', notificationError);
      }
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
            unit_amount: Math.round(amount * 100), // Amount in cents
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
        amount: Math.round(amount * 100), // Amount in cents
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
    const customPaymentIntentId = session.metadata?.customPaymentIntentId;

    if (!fanUserId || !buyUserId || !customPaymentIntentId) {
      console.error('Missing fanUserId, buyUserId, or customPaymentIntentId in fan_subscription_buy session metadata');
      return;
    }

    const fanUser = await this.prisma.user.findUnique({ where: { id: fanUserId } });
    if (!fanUser) {
      console.error(`Fan user ${fanUserId} not found for fan_subscription_buy payment`);
      return;
    }

    // Update the existing pending payment record to success
    const updateResult = await this.prisma.payment.updateMany({
      where: {
        userId: buyUserId,
        stripePaymentIntentId: customPaymentIntentId,
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
    // Creator (buyUserId) receives 95% in their Stripe Connect account via destination charge; no in-app balance hold.
    console.log(`✅ Fan subscription buy payment processed: Fan ${fanUserId} subscribed to ${buyUserId} for one month`);
  }

  async createOneTimePaymentCheckForFanSubscription(amount: number, buyUserId: string, fanUserId: string) {
    const destinationAccountId = await this.requireCanReceivePayments(buyUserId);
    const customerId = await this.ensureStripeCustomer(fanUserId);
    const buyUser = await this.prisma.user.findUnique({ where: { id: buyUserId } });
    if (!buyUser) throw new BadRequestException('Buy user not found');

    const customPaymentIntentId = uuidv4();
    const amountCents = Math.round(amount * 100);
    const applicationFeeCents = Math.round(amountCents * this.PLATFORM_FEE_PERCENT);

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
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: destinationAccountId },
      },
      metadata: {
        type: 'fan_subscription_buy',
        fanUserId,
        buyUserId,
        amount: amount.toString(),
        customPaymentIntentId,
      },
    });

    // Create pending payment record
    await this.prisma.payment.create({
      data: {
        userId: buyUserId,
        amount: Math.round(amount * 100), // Amount in cents
        currency: 'USD',
        status: 'pending',
        forPayment: 'fanSubscriptionBuy',
        stripePaymentIntentId: customPaymentIntentId,
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

  // Valens: withdrawals disabled; cron commented to avoid log noise.
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingWithdrawals() {
    return;
    // console.log('[CRON] Processing pending withdrawals...');
    // const pendingWithdrawals = await this.prisma.withdrawalRecord.findMany({
    //   where: { status: 'pending' },
    //   select: { id: true },
    // });
    // if (pendingWithdrawals.length === 0) {
    //   console.log('[CRON] No pending withdrawals to process');
    //   return;
    // }
    // ...
    // for (const withdrawal of pendingWithdrawals) {
    //   try {
    //     await this.processWithdrawal(withdrawal.id);
    //     ...
    //   } catch (error) { ... }
    // }
    // console.log('[CRON] Finished processing pending withdrawals');
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

  async userTransactionHistory(userId: string, transactionType: string, limit: number = 50) {
    const take = Math.min(Math.max(1, limit), 100);
    if (transactionType === 'all') {
      const [withdrawals, tokenSales, tokenPurchases, payments] = await Promise.all([
        this.prisma.withdrawalRecord.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        this.prisma.tokenSale.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        this.prisma.tokenPurchase.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        this.prisma.payment.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take,
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
            orderBy: { createdAt: 'desc' },
            take,
          });
        case 'tokenSale':
          return this.prisma.tokenSale.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take,
          });
        case 'tokenPurchase':
          return this.prisma.tokenPurchase.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take,
          });
        case 'payment':
          return this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take,
          });
        default:
          throw new BadRequestException('Invalid transaction type');
      }
    }
  }

  async addDigitalBadge(senderId: string, dto: { receiverId: string; amount: number; txId: string }) {
    try {
      const digitalBadge = await this.prisma.digital_transaction.create({
        data: {
          senderId,
          receiverId: dto.receiverId,
          amount: dto.amount,
          txId: dto.txId,
          txType: 'MANUAL',
          txValue: dto.amount,
        },
      });
      return digitalBadge;
    } catch (error) {
      throw new BadRequestException(error?.message || 'Failed to add digital badge');
    }
  }

  async getDigitalBadge(userId: string) {
    const result = await this.prisma.digital_transaction.aggregate({
      where: { receiverId: userId },
      _sum: { amount: true },
    });
    const totalAmount = result._sum?.amount != null ? Number(result._sum.amount) : 0;
    return { totalAmount };
  }

  async verifyAndStoreUsdtTransaction(
    authUserId: string,
    dto: { senderId: string; receiverId: string; txHash: string; chain: string },
  ) {
    try {
      const normalizedChain = dto.chain.toUpperCase();
      const txHash = dto.txHash.toLowerCase();

      if (dto.senderId !== authUserId) {
        throw new BadRequestException('Sender ID mismatch');
      }

      const existing = await this.prisma.digital_transaction.findUnique({
        where: { txId: txHash },
      });
      if (existing) {
        throw new BadRequestException('Transaction already recorded');
      }

      const rpcUrl = this.getRpcUrlForChain(normalizedChain);
      if (!rpcUrl) {
        throw new BadRequestException('Only POLYGON is supported, or POLYGON RPC URL is missing');
      }

      const usdtAddress = this.getUsdtAddressForChain(normalizedChain);
      if (!usdtAddress) {
        throw new BadRequestException('USDT contract address not configured for chain');
      }

      const [senderUser, receiverUser] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: dto.senderId }, select: { walletAddress: true } }),
        this.prisma.user.findUnique({ where: { id: dto.receiverId }, select: { walletAddress: true } }),
      ]);
      if (!senderUser?.walletAddress) {
        throw new BadRequestException('Sender wallet address not configured');
      }
      if (!receiverUser?.walletAddress) {
        throw new BadRequestException('Receiver wallet address not configured');
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new BadRequestException('Transaction not found or not yet mined');
      }
      if (receipt.status !== 1) {
        throw new BadRequestException('Transaction failed on-chain');
      }

      const normalizedUsdt = ethers.getAddress(usdtAddress);
      const normalizedSenderWallet = ethers.getAddress(senderUser.walletAddress);
      const normalizedReceiverWallet = ethers.getAddress(receiverUser.walletAddress);
      const transferEvent = this.usdtInterface.getEvent('Transfer');
      if (!transferEvent) {
        throw new BadRequestException('USDT Transfer event not found in ABI');
      }
      const transferTopic = transferEvent.topicHash;

      let matchedTransfer: { from: string; to: string; value: bigint } | null = null;
      for (const log of receipt.logs) {
        if (!log.address) continue;
        const logAddress = ethers.getAddress(log.address);
        if (logAddress !== normalizedUsdt) continue;
        if (!log.topics || log.topics.length === 0 || log.topics[0] !== transferTopic) continue;

        const parsed = this.usdtInterface.parseLog({ topics: log.topics, data: log.data });
        if (!parsed) continue;

        const fromRaw = (parsed.args as any)?.from as string | undefined;
        const toRaw = (parsed.args as any)?.to as string | undefined;
        const valueRaw = (parsed.args as any)?.value as bigint | undefined;
        if (!fromRaw || !toRaw || valueRaw === undefined || valueRaw === null) continue;

        const from = ethers.getAddress(fromRaw);
        const to = ethers.getAddress(toRaw);
        const value = valueRaw;

        if (from !== normalizedSenderWallet) continue;
        if (to !== normalizedReceiverWallet) continue;
        matchedTransfer = { from, to, value };
        break;
      }

      if (!matchedTransfer) {
        throw new BadRequestException('USDT transfer between sender and receiver wallets not found in transaction logs');
      }

      const amount = ethers.formatUnits(matchedTransfer.value, 6);
      const txValue = matchedTransfer.value.toString();

      const saved = await this.prisma.digital_transaction.create({
        data: {
          senderId: dto.senderId,
          receiverId: dto.receiverId,
          txId: txHash,
          txType: normalizedChain,
          amount,
          txValue,
        },
      });

      return saved;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Failed to verify transaction');
    }
  }
}

