import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { PagBankService } from '../pagbank/pagbank.service';
import { PaymentProviderResolver } from '../marketPlace/payment/payment-provider.resolver';
import Stripe from 'stripe';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

const PLATFORM_POINTS_HIT_COST = 1000;
const PLATFORM_POINTS_HIT_COUNT = 1;
const MIN_WITHDRAWAL_MAJOR = 10;

@Injectable()
export class BillingService {
  private stripe: Stripe;
  private readonly usdtInterface = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly walletService: WalletService,
    private readonly pagBankService: PagBankService,
    private readonly paymentProviderResolver: PaymentProviderResolver,
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
    if (!userId) throw new BadRequestException('User ID required');
    const provider = await this.paymentProviderResolver.resolveProviderForUser(userId);
    if (provider === 'PAGBANK') {
      throw new BadRequestException(
        'Brazil users use PagBank only. Stripe checkout is not available for this account.',
      );
    }
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
    const provider = await this.paymentProviderResolver.resolveProviderForUser(userId);
    if (provider === 'PAGBANK') {
      return this.createPagBankValensSubscriptionCheckout(userId);
    }

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

  /**
   * BR Valens plan: one-time PIX for ~1 month access (PagBank has no Stripe-style recurring Billing).
   * Amount from VALENS_SUBSCRIPTION_AMOUNT_CENTS / PAGBANK_SUBSCRIPTION_AMOUNT_MINOR, else Stripe price lookup.
   */
  private async resolveValensSubscriptionAmountMinor(userId: string): Promise<number> {
    const fromEnv = Number(
      process.env.PAGBANK_SUBSCRIPTION_AMOUNT_MINOR ||
      process.env.VALENS_SUBSCRIPTION_AMOUNT_CENTS ||
      0,
    );
    if (fromEnv > 0) return Math.round(fromEnv);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profile: true } });
    const isCompany = (user?.profile || '').toLowerCase() === 'company';
    const priceId = (isCompany ? process.env.STRIPE_PRICE_ID_Business : process.env.STRIPE_PRICE_ID) as string;
    if (!priceId) {
      throw new BadRequestException(
        'Set PAGBANK_SUBSCRIPTION_AMOUNT_MINOR (or VALENS_SUBSCRIPTION_AMOUNT_CENTS) for Brazil subscriptions',
      );
    }
    const price = await this.stripe.prices.retrieve(priceId);
    const amount = price.unit_amount || 0;
    if (amount <= 0) {
      throw new BadRequestException('Valens subscription price amount is missing');
    }
    return amount;
  }

  private async createPagBankValensSubscriptionCheckout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, userName: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const amountMinor = await this.resolveValensSubscriptionAmountMinor(userId);
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: Math.round(amountMinor / 100),
        totalAmount: Math.round(amountMinor / 100),
        currency: 'BRL',
        status: 'pending',
        forPayment: 'subscription',
        periodStart,
        periodEnd,
      },
    });

    const checkout = await this.pagBankService.createPixCheckout({
      referenceId: payment.id,
      amountMinor,
      description: 'Valens Subscription',
      customerEmail: user.email || undefined,
      customerName: user.displayName || user.userName || undefined,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentIntentId: checkout.orderId },
    });

    return {
      id: checkout.orderId,
      url: checkout.checkoutUrl,
      ...checkout,
    };
  }

  /** Default platform fee: Valens keeps 5%, rest goes to creator's Stripe Connect account (no holding). */
  private readonly PLATFORM_FEE_PERCENT = 0.05;
  /** Pay-following platform fee: Valens keeps 20%, rest credits creator available wallet. */
  private readonly PAY_FOLLOWING_PLATFORM_FEE_PERCENT = 0.20;
  /** Ebook platform fee: Valens keeps 10%, rest goes to seller Stripe Connect account. */
  private readonly EBOOK_PLATFORM_FEE_PERCENT = 0.10;

  private getPayFollowingAmountSplit(amountCents: number) {
    const totalAmount = Math.round(amountCents / 100);
    const platformFeeCents = Math.round(amountCents * this.PAY_FOLLOWING_PLATFORM_FEE_PERCENT);
    const receiverAmountCents = Math.max(0, amountCents - platformFeeCents);
    const platformFee = Math.round(platformFeeCents / 100);
    const receiverAmount = Math.max(0, totalAmount - platformFee);

    return {
      totalAmount,
      platformFee,
      receiverAmount,
      platformFeeCents,
      receiverAmountCents,
    };
  }

  private getTipAmountSplit(amountCents: number) {
    const totalAmount = Math.round(amountCents / 100);
    const platformFeeCents = 0;
    const receiverAmountCents = Math.max(0, amountCents - platformFeeCents);
    const platformFee = 0;
    const receiverAmount = Math.max(0, totalAmount - platformFee);

    return {
      totalAmount,
      platformFee,
      receiverAmount,
      platformFeeCents,
      receiverAmountCents,
    };
  }

  private getEbookAmountSplit(amountCents: number) {
    const totalAmount = Math.round(amountCents / 100);
    const platformFeeCents = Math.round(amountCents * this.EBOOK_PLATFORM_FEE_PERCENT);
    const receiverAmountCents = Math.max(0, amountCents - platformFeeCents);
    const platformFee = Math.round(platformFeeCents / 100);
    const receiverAmount = Math.max(0, totalAmount - platformFee);

    return {
      totalAmount,
      platformFee,
      receiverAmount,
      platformFeeCents,
      receiverAmountCents,
    };
  }

  private sumStripeBalanceByCurrency(
    rows: Array<{ amount: number; currency: string }> | null | undefined,
    currency: string,
  ): number {
    if (!rows?.length) return 0;
    const normalized = (currency || 'usd').toLowerCase();
    return rows
      .filter((row) => (row.currency || '').toLowerCase() === normalized)
      .reduce((sum, row) => sum + Math.trunc(row.amount || 0), 0);
  }

  private toMajor(amountMinor: number): number {
    return Number((amountMinor / 100).toFixed(2));
  }

  /**
   * Wallet balance plus provider live availability.
   * effectiveWithdrawableNow = min(app wallet available, provider available now).
   */
  async getWalletBalanceWithProviderAvailability(userId: string) {
    const provider = await this.paymentProviderResolver.ensureUserPaymentProvider(userId);
    const currency = provider === 'PAGBANK' ? 'brl' : 'usd';

    // Keep provider/currency scoped totals for withdrawal calculations.
    const wallet = await this.walletService.getBalance(userId, { currency, provider });

    if (provider === 'PAGBANK') {
      const appWithdrawableMinor = wallet.availableBalanceMinor;
      return {
        ...wallet,
        provider,
        currency,
        appWithdrawableBalanceMinor: appWithdrawableMinor,
        appWithdrawableBalance: this.toMajor(appWithdrawableMinor),
        providerAvailableBalanceMinor: appWithdrawableMinor,
        providerAvailableBalance: this.toMajor(appWithdrawableMinor),
        providerPendingBalanceMinor: 0,
        providerPendingBalance: 0,
        effectiveWithdrawableNowMinor: appWithdrawableMinor,
        effectiveWithdrawableNow: this.toMajor(appWithdrawableMinor),
        providerAvailabilitySource: 'wallet',
        providerAvailabilityNote:
          'PagBank provider live balance API is not queried here. Effective amount uses wallet availability.',
      };
    }

    const appWithdrawableMinor = wallet.availableBalanceMinor;

    try {
      const stripeAccount = await this.stripe.accounts.retrieve();
      const platformBalance = await this.stripe.balance.retrieve();
      const providerAvailableMinor = this.sumStripeBalanceByCurrency(
        platformBalance.available as Array<{ amount: number; currency: string }> | undefined,
        currency,
      );
      const providerPendingMinor = this.sumStripeBalanceByCurrency(
        platformBalance.pending as Array<{ amount: number; currency: string }> | undefined,
        currency,
      );
      const effectiveMinor = Math.min(appWithdrawableMinor, providerAvailableMinor);

      return {
        ...wallet,
        provider,
        currency,
        appWithdrawableBalanceMinor: appWithdrawableMinor,
        appWithdrawableBalance: this.toMajor(appWithdrawableMinor),
        providerAvailableBalanceMinor: providerAvailableMinor,
        providerAvailableBalance: this.toMajor(providerAvailableMinor),
        providerPendingBalanceMinor: providerPendingMinor,
        providerPendingBalance: this.toMajor(providerPendingMinor),
        effectiveWithdrawableNowMinor: effectiveMinor,
        effectiveWithdrawableNow: this.toMajor(effectiveMinor),
        providerAvailabilitySource: 'stripe_platform_balance',
        stripeAccountId: stripeAccount.id,
        stripeBalanceFetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        ...wallet,
        provider,
        currency,
        appWithdrawableBalanceMinor: appWithdrawableMinor,
        appWithdrawableBalance: this.toMajor(appWithdrawableMinor),
        providerAvailableBalanceMinor: null,
        providerAvailableBalance: null,
        providerPendingBalanceMinor: null,
        providerPendingBalance: null,
        effectiveWithdrawableNowMinor: null,
        effectiveWithdrawableNow: null,
        providerAvailabilitySource: 'stripe_platform_balance_error',
        stripeBalanceFetchedAt: new Date().toISOString(),
        providerAvailabilityError: error?.message || 'Unable to fetch Stripe platform balance',
      };
    }
  }

  /** Check if user has completed provider onboarding and can withdraw. */
  async getOnboardingStatus(userId: string): Promise<{
    canReceivePayments: boolean;
    onboardingUrl?: string;
    accountId?: string;
    message?: string;
    provider: 'STRIPE' | 'PAGBANK';
    country?: string | null;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const provider = await this.paymentProviderResolver.ensureUserPaymentProvider(userId);

    if (provider === 'PAGBANK') {
      const status = await this.pagBankService.getOnboardingStatus(userId);
      return { ...status, country: user.country };
    }

    if (!user.stripeAccountId) {
      return {
        provider: 'STRIPE',
        country: user.country,
        canReceivePayments: false,
        message: 'Complete Stripe onboarding to withdraw available balance.',
      };
    }
    try {
      const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
      const canReceive = !!(account.details_submitted && account.payouts_enabled !== false);
      return {
        provider: 'STRIPE',
        country: user.country,
        canReceivePayments: canReceive,
        accountId: user.stripeAccountId,
        message: canReceive
          ? undefined
          : 'Finish onboarding (e.g. add bank account) to withdraw.',
      };
    } catch {
      return {
        provider: 'STRIPE',
        country: user.country,
        canReceivePayments: false,
        accountId: user.stripeAccountId,
        message: 'Stripe account not ready.',
      };
    }
  }

  /** Throws if user cannot receive withdrawals to Connect (onboarding required). */
  private async requireCanReceivePayments(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!user.stripeAccountId) {
      throw new BadRequestException(
        'Complete Stripe onboarding before withdrawing. Call POST /billing/create-onboarding-link first.',
      );
    }
    const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.details_submitted) {
      throw new BadRequestException(
        'Finish Stripe onboarding (identity and bank details) before withdrawing.',
      );
    }
    return user.stripeAccountId;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('User not found');
  }

  /** Credit seller available wallet (idempotent via payment ref). Uses seller paymentProvider. */
  private async creditSellerAvailableWallet(params: {
    sellerUserId: string;
    amountMinor: number;
    source: 'TIP' | 'FOLLOWING' | 'EBOOK' | 'SHOP_EBOOK' | 'FAN_SUBSCRIPTION' | 'MISSION_DONATION';
    refId: string;
    note?: string;
    currency?: string;
  }) {
    if (!params.sellerUserId || params.amountMinor <= 0) return;
    const provider = await this.paymentProviderResolver.resolveProviderForUser(params.sellerUserId);
    await this.walletService.creditAvailable({
      userId: params.sellerUserId,
      amountMinor: params.amountMinor,
      currency: params.currency || (provider === 'PAGBANK' ? 'brl' : 'usd'),
      provider,
      source: params.source,
      refType: 'PAYMENT',
      refId: params.refId,
      note: params.note,
    });
  }

  async createOneTimePaymentCheckoutSession(
    payerUserId: string,
    contentUserId: string,
    amount: number,
  ) {
    await this.ensureUserExists(contentUserId);

    const payerProvider = await this.paymentProviderResolver.resolveProviderForUser(payerUserId);
    if (payerProvider === 'PAGBANK') {
      return this.createPagBankFollowingCheckout(payerUserId, contentUserId, amount);
    }

    const customerId = await this.ensureStripeCustomer(payerUserId);
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;
    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
    }
    const amountCents = Math.round(amount * 100);
    const {
      platformFeeCents: applicationFeeCents,
      receiverAmountCents,
      platformFee,
      receiverAmount,
      totalAmount,
    } = this.getPayFollowingAmountSplit(amountCents);
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
        metadata: {
          payerUserId,
          contentUserId,
          type: 'following',
          amount: amount.toString(),
          totalAmount: totalAmount.toString(),
          platformFee: platformFee.toString(),
          platformFeeCents: applicationFeeCents.toString(),
          receiverAmount: receiverAmount.toString(),
          receiverAmountCents: receiverAmountCents.toString(),
        },
      },
      metadata: {
        payerUserId,
        contentUserId,
        type: 'following',
        amount: amount.toString(),
        totalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        platformFeeCents: applicationFeeCents.toString(),
        receiverAmount: receiverAmount.toString(),
        receiverAmountCents: receiverAmountCents.toString(),
      },
    });
    return session;
  }

  async createTipCheckoutSession(
    senderUserId: string,
    receiverUserId: string,
    amount: number,
  ) {
    await this.ensureUserExists(receiverUserId);

    const payerProvider = await this.paymentProviderResolver.resolveProviderForUser(senderUserId);
    if (payerProvider === 'PAGBANK') {
      return this.createPagBankTipCheckout(senderUserId, receiverUserId, amount);
    }

    const customerId = await this.ensureStripeCustomer(senderUserId);
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;
    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
    }

    const amountCents = Math.round(amount * 100);
    const {
      platformFeeCents: applicationFeeCents,
      receiverAmountCents,
      platformFee,
      receiverAmount,
      totalAmount,
    } = this.getTipAmountSplit(amountCents);

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
              name: 'Tip Payment',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          senderUserId,
          receiverUserId,
          type: 'tip',
          amount: amount.toString(),
          totalAmount: totalAmount.toString(),
          platformFee: platformFee.toString(),
          platformFeeCents: applicationFeeCents.toString(),
          receiverAmount: receiverAmount.toString(),
          receiverAmountCents: receiverAmountCents.toString(),
        },
      },
      metadata: {
        senderUserId,
        receiverUserId,
        type: 'tip',
        amount: amount.toString(),
        totalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        platformFeeCents: applicationFeeCents.toString(),
        receiverAmount: receiverAmount.toString(),
        receiverAmountCents: receiverAmountCents.toString(),
      },
    });

    return session;
  }

  private async createPagBankTipCheckout(
    senderUserId: string,
    receiverUserId: string,
    amount: number,
  ) {
    const amountCents = Math.round(amount * 100);
    const { platformFee, receiverAmount, totalAmount } = this.getTipAmountSplit(amountCents);
    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
      select: { email: true, displayName: true, userName: true },
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId: senderUserId,
        receiverId: receiverUserId,
        amount: receiverAmount,
        platformFee,
        totalAmount,
        currency: 'BRL',
        status: 'pending',
        forPayment: 'TIP',
      },
    });

    const checkout = await this.pagBankService.createPixCheckout({
      referenceId: payment.id,
      amountMinor: amountCents,
      description: 'Tip Payment',
      customerEmail: sender?.email || undefined,
      customerName: sender?.displayName || sender?.userName || undefined,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentIntentId: checkout.orderId },
    });

    return {
      id: checkout.orderId,
      url: checkout.checkoutUrl,
      ...checkout,
    };
  }

  private async createPagBankFollowingCheckout(
    payerUserId: string,
    contentUserId: string,
    amount: number,
  ) {
    const amountCents = Math.round(amount * 100);
    const { platformFee, receiverAmount, totalAmount } = this.getPayFollowingAmountSplit(amountCents);
    const payer = await this.prisma.user.findUnique({
      where: { id: payerUserId },
      select: { email: true, displayName: true, userName: true },
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId: payerUserId,
        receiverId: contentUserId,
        amount: receiverAmount,
        platformFee,
        totalAmount,
        currency: 'BRL',
        status: 'pending',
        forPayment: 'following',
      },
    });

    const checkout = await this.pagBankService.createPixCheckout({
      referenceId: payment.id,
      amountMinor: amountCents,
      description: 'Following Payment',
      customerEmail: payer?.email || undefined,
      customerName: payer?.displayName || payer?.userName || undefined,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentIntentId: checkout.orderId },
    });

    return {
      id: checkout.orderId,
      url: checkout.checkoutUrl,
      ...checkout,
    };
  }

  async createEbookCheckoutSession(
    buyerUserId: string,
    targetUserId: string,
    postId: string,
    amount: number,
  ) {
    await this.ensureUserExists(targetUserId);

    const buyerProvider = await this.paymentProviderResolver.resolveProviderForUser(buyerUserId);
    if (buyerProvider === 'PAGBANK') {
      // continue below after validations, then branch before Stripe session
    }

    const customerId = buyerProvider === 'STRIPE' ? await this.ensureStripeCustomer(buyerUserId) : null;
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        userId: true,
        format: true,
        deletedAt: true,
        isDelete: true,
      },
    });

    if (!post || post.deletedAt || post.isDelete !== 'no') {
      throw new BadRequestException('Ebook post not found');
    }

    if (post.format !== 'ebook') {
      throw new BadRequestException('Selected post is not an ebook');
    }

    if (post.userId !== targetUserId) {
      throw new BadRequestException('targetUserId does not own this ebook post');
    }

    const amountCents = Math.round(amount * 100);
    const {
      platformFeeCents,
      receiverAmountCents,
      platformFee,
      receiverAmount,
      totalAmount,
    } = this.getEbookAmountSplit(amountCents);

    const ebookPayment = await (this.prisma as any).ebookPayments.create({
      data: {
        buyerId: buyerUserId,
        sellerId: targetUserId,
        postId,
        amount: amountCents,
        platformFee: platformFeeCents,
        sellerAmount: receiverAmountCents,
        currency: buyerProvider === 'PAGBANK' ? 'brl' : 'usd',
        provider: buyerProvider,
        status: 'PENDING',
        metadata: {
          buyerUserId,
          targetUserId,
          postId,
          amount,
          totalAmount,
          platformFee,
          receiverAmount,
          receiverAmountCents,
        },
      },
      select: { id: true },
    });

    if (buyerProvider === 'PAGBANK') {
      try {
        const buyer = await this.prisma.user.findUnique({
          where: { id: buyerUserId },
          select: { email: true, displayName: true, userName: true },
        });
        const checkout = await this.pagBankService.createPixCheckout({
          referenceId: ebookPayment.id,
          amountMinor: amountCents,
          description: 'Ebook Payment',
          customerEmail: buyer?.email || undefined,
          customerName: buyer?.displayName || buyer?.userName || undefined,
        });
        await (this.prisma as any).ebookPayments.update({
          where: { id: ebookPayment.id },
          data: {
            checkoutSessionId: checkout.orderId,
            paymentIntentId: checkout.orderId,
          },
        });
        return {
          id: checkout.orderId,
          url: checkout.checkoutUrl,
          ...checkout,
        };
      } catch (error) {
        await (this.prisma as any).ebookPayments.update({
          where: { id: ebookPayment.id },
          data: { status: 'FAILED' },
        });
        throw error;
      }
    }

    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
    }
    if (!customerId) {
      throw new BadRequestException('Stripe customer required');
    }

    try {
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
                name: 'Ebook Payment',
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            type: 'ebook',
            ebookPaymentId: ebookPayment.id,
            buyerUserId,
            targetUserId,
            postId,
            amount: amount.toString(),
            totalAmount: totalAmount.toString(),
            platformFee: platformFee.toString(),
            platformFeeCents: platformFeeCents.toString(),
            receiverAmount: receiverAmount.toString(),
            receiverAmountCents: receiverAmountCents.toString(),
          },
        },
        metadata: {
          type: 'ebook',
          ebookPaymentId: ebookPayment.id,
          buyerUserId,
          targetUserId,
          postId,
          amount: amount.toString(),
          totalAmount: totalAmount.toString(),
          platformFee: platformFee.toString(),
          platformFeeCents: platformFeeCents.toString(),
          receiverAmount: receiverAmount.toString(),
          receiverAmountCents: receiverAmountCents.toString(),
        },
      });

      await (this.prisma as any).ebookPayments.update({
        where: { id: ebookPayment.id },
        data: {
          checkoutSessionId: session.id,
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        },
      });

      return session;
    } catch {
      await (this.prisma as any).ebookPayments.update({
        where: { id: ebookPayment.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Stripe API failure while creating ebook checkout session');
    }
  }

  async createShopEbookCheckoutSession(
    buyerUserId: string,
    closetId: string,
    ebookId: string,
    amount: number,
  ) {
    if (!closetId) throw new BadRequestException('closetId is required');
    if (!ebookId) throw new BadRequestException('ebookId is required');
    if (!amount || amount <= 0) throw new BadRequestException('Invalid amount');

    const ebook = await (this.prisma as any).shopEbook.findUnique({
      where: { id: ebookId },
      select: {
        id: true,
        userId: true,
        closetId: true,
        amount: true,
        caption: true,
      },
    });

    if (!ebook) {
      throw new BadRequestException('Shop ebook not found');
    }

    if (ebook.closetId !== closetId) {
      throw new BadRequestException('ebookId does not belong to closetId');
    }

    if (ebook.userId === buyerUserId) {
      throw new BadRequestException('You cannot buy your own ebook');
    }

    const closet = await this.prisma.mycloset.findUnique({
      where: { id: closetId },
      select: { id: true, userId: true, shopName: true },
    });

    if (!closet) {
      throw new BadRequestException('Closet not found');
    }

    if (closet.userId !== ebook.userId) {
      throw new BadRequestException('Closet owner does not match ebook seller');
    }

    if (Math.abs((ebook.amount ?? 0) - amount) > 0.000001) {
      throw new BadRequestException('Amount mismatch with ebook price');
    }

    await this.ensureUserExists(ebook.userId);
    const buyerProvider = await this.paymentProviderResolver.resolveProviderForUser(buyerUserId);
    const customerId = buyerProvider === 'STRIPE' ? await this.ensureStripeCustomer(buyerUserId) : null;
    const successUrl = process.env.STRIPE_SUCCESS_URL as string;
    const cancelUrl = process.env.STRIPE_CANCEL_URL as string;

    const amountCents = Math.round(amount * 100);
    const {
      platformFeeCents,
      receiverAmountCents,
      platformFee,
      receiverAmount,
      totalAmount,
    } = this.getEbookAmountSplit(amountCents);

    const shopEbookPayment = await (this.prisma as any).shopEbookPayments.create({
      data: {
        buyerId: buyerUserId,
        sellerId: ebook.userId,
        closetId,
        ebookId,
        amount: amountCents,
        platformFee: platformFeeCents,
        sellerAmount: receiverAmountCents,
        currency: buyerProvider === 'PAGBANK' ? 'brl' : 'usd',
        provider: buyerProvider,
        status: 'PENDING',
        metadata: {
          buyerUserId,
          sellerUserId: ebook.userId,
          closetId,
          ebookId,
          amount,
          totalAmount,
          platformFee,
          receiverAmount,
          receiverAmountCents,
        },
      },
      select: { id: true },
    });

    if (buyerProvider === 'PAGBANK') {
      try {
        const buyer = await this.prisma.user.findUnique({
          where: { id: buyerUserId },
          select: { email: true, displayName: true, userName: true },
        });
        const checkout = await this.pagBankService.createPixCheckout({
          referenceId: shopEbookPayment.id,
          amountMinor: amountCents,
          description: ebook.caption || 'Shop Ebook Payment',
          customerEmail: buyer?.email || undefined,
          customerName: buyer?.displayName || buyer?.userName || undefined,
        });
        await (this.prisma as any).shopEbookPayments.update({
          where: { id: shopEbookPayment.id },
          data: {
            checkoutSessionId: checkout.orderId,
            paymentIntentId: checkout.orderId,
          },
        });
        return { id: checkout.orderId, url: checkout.checkoutUrl, ...checkout };
      } catch (error) {
        await (this.prisma as any).shopEbookPayments.update({
          where: { id: shopEbookPayment.id },
          data: { status: 'FAILED' },
        });
        throw error;
      }
    }

    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
    }
    if (!customerId) throw new BadRequestException('Stripe customer required');

    try {
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
                name: ebook.caption || 'Shop Ebook Payment',
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            type: 'shop_ebook',
            shopEbookPaymentId: shopEbookPayment.id,
            buyerUserId,
            sellerUserId: ebook.userId,
            closetId,
            ebookId,
            amount: amount.toString(),
            totalAmount: totalAmount.toString(),
            platformFee: platformFee.toString(),
            platformFeeCents: platformFeeCents.toString(),
            receiverAmount: receiverAmount.toString(),
            receiverAmountCents: receiverAmountCents.toString(),
          },
        },
        metadata: {
          type: 'shop_ebook',
          shopEbookPaymentId: shopEbookPayment.id,
          buyerUserId,
          sellerUserId: ebook.userId,
          closetId,
          ebookId,
          amount: amount.toString(),
          totalAmount: totalAmount.toString(),
          platformFee: platformFee.toString(),
          platformFeeCents: platformFeeCents.toString(),
          receiverAmount: receiverAmount.toString(),
          receiverAmountCents: receiverAmountCents.toString(),
        },
      });

      await (this.prisma as any).shopEbookPayments.update({
        where: { id: shopEbookPayment.id },
        data: {
          checkoutSessionId: session.id,
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        },
      });

      return session;
    } catch {
      await (this.prisma as any).shopEbookPayments.update({
        where: { id: shopEbookPayment.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Stripe API failure while creating shop ebook checkout session');
    }
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

    // Increment user hits by 5 for subscription
    const postHit = await this.prisma.postHit.findFirst({
      where: { userId: user.id },
    });

    if (postHit) {
      await this.prisma.postHit.update({
        where: { id: postHit.id },
        data: { hitLeft: { increment: 5 } },
      });
    } else {
      await this.prisma.postHit.create({
        data: {
          userId: user.id,
          hitLeft: 5,
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
    // console.log('[Billing] handleOneTimePaymentSuccess — paymentIntentId:', paymentIntent.id);
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
    const {
      totalAmount,
      platformFee,
      receiverAmount,
    } = this.getPayFollowingAmountSplit(amountCents);
    const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
    const contentUserId = paymentIntent.metadata?.contentUserId;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const payment = await this.prisma.payment.create({
      data: {
        user: { connect: { id: user.id } },
        ...(contentUserId && { receiver: { connect: { id: contentUserId } } }),
        amount: receiverAmount,
        platformFee,
        totalAmount,
        currency,
        status: 'succeeded',
        forPayment: 'following',
        stripePaymentIntentId: paymentIntent.id,
        periodStart,
        periodEnd,
      },
    });

    if (contentUserId) {
      const receiverAmountCents =
        Number(paymentIntent.metadata?.receiverAmountCents) ||
        Math.round(receiverAmount * 100);
      await this.creditSellerAvailableWallet({
        sellerUserId: contentUserId,
        amountMinor: receiverAmountCents,
        source: 'FOLLOWING',
        refId: paymentIntent.id,
        currency: paymentIntent.currency || 'usd',
        note: `Pay-following payment ${payment.id}`,
      });
    }
  }

  async handleOneTimePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    // eslint-disable-next-line no-console
    // console.log('[Billing] handleOneTimePaymentFailed — paymentIntentId:', paymentIntent.id);
    const existing = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id, forPayment: 'following' },
    });
    if (existing) {
      await this.prisma.payment.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
      // eslint-disable-next-line no-console
      // console.log('[Billing] Payment updated to failed (pay-following): id=', existing.id);
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
    const {
      totalAmount,
      platformFee,
      receiverAmount,
    } = this.getPayFollowingAmountSplit(amountCents);
    const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
    const contentUserId = paymentIntent.metadata?.contentUserId;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const payment = await this.prisma.payment.create({
      data: {
        user: { connect: { id: user.id } },
        ...(contentUserId && { receiver: { connect: { id: contentUserId } } }),
        amount: receiverAmount,
        platformFee,
        totalAmount,
        currency,
        status: 'failed',
        forPayment: 'following',
        stripePaymentIntentId: paymentIntent.id,
        periodStart,
        periodEnd,
      },
    });
    // eslint-disable-next-line no-console
    // console.log('[Billing] Payment created (pay-following failed): id=', payment.id, 'userId=', user.id, 'receiverId=', contentUserId ?? 'none', 'amountReceived(USD)=', receiverAmount, 'platformFee(USD)=', platformFee, 'totalAmount(USD)=', totalAmount, 'status=failed');
  }

  async handleTipPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
    if (!customerId) return;

    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;

    const amountCents = paymentIntent.amount ?? 0;
    const {
      totalAmount,
      platformFee,
      receiverAmount,
    } = this.getTipAmountSplit(amountCents);
    const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
    const receiverUserId = paymentIntent.metadata?.receiverUserId;

    await this.prisma.payment.create({
      data: {
        user: { connect: { id: user.id } },
        ...(receiverUserId && { receiver: { connect: { id: receiverUserId } } }),
        amount: receiverAmount,
        platformFee,
        totalAmount,
        currency,
        status: 'succeeded',
        forPayment: 'TIP',
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    if (receiverUserId) {
      const receiverAmountCents =
        Number(paymentIntent.metadata?.receiverAmountCents) ||
        Math.round(receiverAmount * 100);
      await this.creditSellerAvailableWallet({
        sellerUserId: receiverUserId,
        amountMinor: receiverAmountCents,
        source: 'TIP',
        refId: paymentIntent.id,
        currency: paymentIntent.currency || 'usd',
        note: `Tip payment ${paymentIntent.id}`,
      });
    }
  }

  async handleTipPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const existing = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id, forPayment: 'TIP' },
    });
    if (existing) {
      await this.prisma.payment.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
      return;
    }

    const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
    if (!customerId) return;

    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;

    const amountCents = paymentIntent.amount ?? 0;
    const {
      totalAmount,
      platformFee,
      receiverAmount,
    } = this.getTipAmountSplit(amountCents);
    const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
    const receiverUserId = paymentIntent.metadata?.receiverUserId;

    await this.prisma.payment.create({
      data: {
        user: { connect: { id: user.id } },
        ...(receiverUserId && { receiver: { connect: { id: receiverUserId } } }),
        amount: receiverAmount,
        platformFee,
        totalAmount,
        currency,
        status: 'failed',
        forPayment: 'TIP',
        stripePaymentIntentId: paymentIntent.id,
      },
    });
  }

  async handleEbookPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const existing = await (this.prisma as any).ebookPayments.findFirst({
      where: {
        OR: [
          { paymentIntentId: paymentIntent.id },
          ...(paymentIntent.metadata?.ebookPaymentId ? [{ id: paymentIntent.metadata.ebookPaymentId }] : []),
        ],
      },
      select: { id: true, status: true, sellerId: true, sellerAmount: true, currency: true },
    });

    if (existing) {
      if (existing.status === 'SUCCEEDED') {
        await this.creditSellerAvailableWallet({
          sellerUserId: existing.sellerId,
          amountMinor: existing.sellerAmount,
          source: 'EBOOK',
          refId: existing.id,
          currency: existing.currency || paymentIntent.currency || 'usd',
          note: `Ebook payment ${existing.id}`,
        });
        return;
      }
      await (this.prisma as any).ebookPayments.update({
        where: { id: existing.id },
        data: { status: 'SUCCEEDED', paymentIntentId: paymentIntent.id },
      });
      await this.creditSellerAvailableWallet({
        sellerUserId: existing.sellerId,
        amountMinor: existing.sellerAmount,
        source: 'EBOOK',
        refId: existing.id,
        currency: existing.currency || paymentIntent.currency || 'usd',
        note: `Ebook payment ${existing.id}`,
      });
      return;
    }

    const buyerUserId = paymentIntent.metadata?.buyerUserId;
    const targetUserId = paymentIntent.metadata?.targetUserId;
    const postId = paymentIntent.metadata?.postId;

    if (!buyerUserId || !targetUserId || !postId) return;

    const amountCents = paymentIntent.amount ?? 0;
    const { platformFeeCents, receiverAmountCents } = this.getEbookAmountSplit(amountCents);

    const created = await (this.prisma as any).ebookPayments.create({
      data: {
        buyerId: buyerUserId,
        sellerId: targetUserId,
        postId,
        amount: amountCents,
        platformFee: platformFeeCents,
        sellerAmount: receiverAmountCents,
        currency: paymentIntent.currency?.toLowerCase() ?? 'usd',
        provider: 'STRIPE',
        status: 'SUCCEEDED',
        paymentIntentId: paymentIntent.id,
        metadata: {
          source: 'payment_intent.succeeded',
          paymentIntentId: paymentIntent.id,
        },
      },
      select: { id: true, sellerId: true, sellerAmount: true, currency: true },
    });

    await this.creditSellerAvailableWallet({
      sellerUserId: created.sellerId,
      amountMinor: created.sellerAmount,
      source: 'EBOOK',
      refId: created.id,
      currency: created.currency || 'usd',
      note: `Ebook payment ${created.id}`,
    });
  }

  async handleEbookPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const existing = await (this.prisma as any).ebookPayments.findFirst({
      where: {
        OR: [
          { paymentIntentId: paymentIntent.id },
          ...(paymentIntent.metadata?.ebookPaymentId ? [{ id: paymentIntent.metadata.ebookPaymentId }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await (this.prisma as any).ebookPayments.update({
        where: { id: existing.id },
        data: { status: 'FAILED', paymentIntentId: paymentIntent.id },
      });
      return;
    }

    const buyerUserId = paymentIntent.metadata?.buyerUserId;
    const targetUserId = paymentIntent.metadata?.targetUserId;
    const postId = paymentIntent.metadata?.postId;
    if (!buyerUserId || !targetUserId || !postId) return;

    const amountCents = paymentIntent.amount ?? 0;
    const { platformFeeCents, receiverAmountCents } = this.getEbookAmountSplit(amountCents);

    await (this.prisma as any).ebookPayments.create({
      data: {
        buyerId: buyerUserId,
        sellerId: targetUserId,
        postId,
        amount: amountCents,
        platformFee: platformFeeCents,
        sellerAmount: receiverAmountCents,
        currency: paymentIntent.currency?.toLowerCase() ?? 'usd',
        provider: 'STRIPE',
        status: 'FAILED',
        paymentIntentId: paymentIntent.id,
        metadata: {
          source: 'payment_intent.payment_failed',
          paymentIntentId: paymentIntent.id,
        },
      },
    });
  }

  async handleShopEbookPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const existing = await (this.prisma as any).shopEbookPayments.findFirst({
      where: {
        OR: [
          { paymentIntentId: paymentIntent.id },
          ...(paymentIntent.metadata?.shopEbookPaymentId ? [{ id: paymentIntent.metadata.shopEbookPaymentId }] : []),
        ],
      },
      select: { id: true, status: true, sellerId: true, sellerAmount: true, currency: true },
    });

    if (existing) {
      if (existing.status === 'SUCCEEDED') {
        await this.creditSellerAvailableWallet({
          sellerUserId: existing.sellerId,
          amountMinor: existing.sellerAmount,
          source: 'SHOP_EBOOK',
          refId: existing.id,
          currency: existing.currency || paymentIntent.currency || 'usd',
          note: `Shop ebook payment ${existing.id}`,
        });
        return;
      }
      await (this.prisma as any).shopEbookPayments.update({
        where: { id: existing.id },
        data: { status: 'SUCCEEDED', paymentIntentId: paymentIntent.id },
      });
      await this.creditSellerAvailableWallet({
        sellerUserId: existing.sellerId,
        amountMinor: existing.sellerAmount,
        source: 'SHOP_EBOOK',
        refId: existing.id,
        currency: existing.currency || paymentIntent.currency || 'usd',
        note: `Shop ebook payment ${existing.id}`,
      });
      return;
    }

    const buyerUserId = paymentIntent.metadata?.buyerUserId;
    const sellerUserId = paymentIntent.metadata?.sellerUserId;
    const closetId = paymentIntent.metadata?.closetId;
    const ebookId = paymentIntent.metadata?.ebookId;

    if (!buyerUserId || !sellerUserId || !closetId || !ebookId) return;

    const amountCents = paymentIntent.amount ?? 0;
    const { platformFeeCents, receiverAmountCents } = this.getEbookAmountSplit(amountCents);

    const created = await (this.prisma as any).shopEbookPayments.create({
      data: {
        buyerId: buyerUserId,
        sellerId: sellerUserId,
        closetId,
        ebookId,
        amount: amountCents,
        platformFee: platformFeeCents,
        sellerAmount: receiverAmountCents,
        currency: paymentIntent.currency?.toLowerCase() ?? 'usd',
        provider: 'STRIPE',
        status: 'SUCCEEDED',
        paymentIntentId: paymentIntent.id,
        metadata: {
          source: 'payment_intent.succeeded',
          paymentIntentId: paymentIntent.id,
        },
      },
      select: { id: true, sellerId: true, sellerAmount: true, currency: true },
    });

    await this.creditSellerAvailableWallet({
      sellerUserId: created.sellerId,
      amountMinor: created.sellerAmount,
      source: 'SHOP_EBOOK',
      refId: created.id,
      currency: created.currency || 'usd',
      note: `Shop ebook payment ${created.id}`,
    });
  }

  async handleShopEbookPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const existing = await (this.prisma as any).shopEbookPayments.findFirst({
      where: {
        OR: [
          { paymentIntentId: paymentIntent.id },
          ...(paymentIntent.metadata?.shopEbookPaymentId ? [{ id: paymentIntent.metadata.shopEbookPaymentId }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await (this.prisma as any).shopEbookPayments.update({
        where: { id: existing.id },
        data: { status: 'FAILED', paymentIntentId: paymentIntent.id },
      });
      return;
    }

    const buyerUserId = paymentIntent.metadata?.buyerUserId;
    const sellerUserId = paymentIntent.metadata?.sellerUserId;
    const closetId = paymentIntent.metadata?.closetId;
    const ebookId = paymentIntent.metadata?.ebookId;
    if (!buyerUserId || !sellerUserId || !closetId || !ebookId) return;

    const amountCents = paymentIntent.amount ?? 0;
    const { platformFeeCents, receiverAmountCents } = this.getEbookAmountSplit(amountCents);

    await (this.prisma as any).shopEbookPayments.create({
      data: {
        buyerId: buyerUserId,
        sellerId: sellerUserId,
        closetId,
        ebookId,
        amount: amountCents,
        platformFee: platformFeeCents,
        sellerAmount: receiverAmountCents,
        currency: paymentIntent.currency?.toLowerCase() ?? 'usd',
        provider: 'STRIPE',
        status: 'FAILED',
        paymentIntentId: paymentIntent.id,
        metadata: {
          source: 'payment_intent.payment_failed',
          paymentIntentId: paymentIntent.id,
        },
      },
    });
  }

  async getLatestTransactions(userId: string, limit: number = 50) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 100),
    });
  }

  async getMyEbookPayments(
    userId: string,
    role: 'buyer' | 'seller' | 'all' = 'all',
    page: number = 1,
    limit: number = 10,
  ) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(50, Math.max(1, limit || 10));
    const skip = (safePage - 1) * safeLimit;

    const where =
      role === 'buyer'
        ? { buyerId: userId }
        : role === 'seller'
          ? { sellerId: userId }
          : {
            OR: [{ buyerId: userId }, { sellerId: userId }],
          };

    const [totalCount, totals, records] = await Promise.all([
      (this.prisma as any).ebookPayments.count({ where }),
      (this.prisma as any).ebookPayments.aggregate({
        where,
        _sum: {
          amount: true,
          platformFee: true,
          sellerAmount: true,
        },
      }),
      (this.prisma as any).ebookPayments.findMany({
        where,
        include: {
          buyer: {
            select: {
              id: true,
              displayName: true,
              image: true,
            },
          },
          seller: {
            select: {
              id: true,
              displayName: true,
              image: true,
            },
          },
          post: {
            select: {
              id: true,
              caption: true,
              format: true,
              amount: true,
              ebookpdf: true,
              thumbnails: true,
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    return {
      role,
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages: Math.ceil(totalCount / safeLimit),
      totals: {
        amount: totals?._sum?.amount ?? 0,
        platformFee: totals?._sum?.platformFee ?? 0,
        sellerAmount: totals?._sum?.sellerAmount ?? 0,
      },
      records,
    };
  }

  async getPayFollowingReceivedSummary(receiverId: string, page: number = 1, pageSize: number = 10) {
    const safePage = Math.max(1, page || 1);
    const safePageSize = Math.min(Math.max(1, pageSize || 10), 50);
    const skip = (safePage - 1) * safePageSize;
    const where = {
      receiverId,
      forPayment: 'following',
      status: 'succeeded',
    } as const;

    const [sumResult, transactions] = await Promise.all([
      this.prisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePageSize,
      }),
    ]);

    return {
      totalAmount: sumResult._sum.amount ?? 0,
      transactions,
    };
  }

  async getSubscriptionEarningGraph(receiverId: string) {
    const now = new Date();

    const formatDayKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const addUtcDays = (d: Date, days: number) => {
      const copy = new Date(d);
      copy.setUTCDate(copy.getUTCDate() + days);
      return copy;
    };

    const startOfUtcDay = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = 7;
    const endDay = startOfUtcDay(now);
    const startDay = addUtcDays(endDay, -(days - 1));

    const rows = await this.prisma.$queryRaw<Array<{ bucket: Date; amount: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS bucket,
             COALESCE(SUM("amount"), 0)::bigint AS amount
      FROM "Payment"
      WHERE "receiverId" = ${receiverId}
        AND "forPayment" = 'following'
        AND "status" = 'succeeded'
        AND "createdAt" >= ${startDay}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const amountByDay = new Map<string, number>(
      rows.map((r) => [formatDayKey(new Date(r.bucket)), Number(r.amount)]),
    );

    const points = Array.from({ length: days }, (_, i) => {
      const dayDate = addUtcDays(startDay, i);
      const day = formatDayKey(dayDate);
      return {
        day,
        dayname: dayNames[dayDate.getUTCDay()],
        amount: amountByDay.get(day) ?? 0,
      };
    });

    const totalAmount = points.reduce((sum, p) => sum + (p.amount || 0), 0);
    return {
      range: '7d',
      totalAmount,
      startDate: startDay.toISOString(),
      endDate: now.toISOString(),
      points,
    };
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

  /**
   * Withdraw from available wallet balance to the user's connected account (Stripe or PagBank).
   * Pending (48h marketplace) balance cannot be withdrawn.
   */
  async requestWithdrawal(userId: string, amount: number) {
    if (!userId) throw new BadRequestException('User ID required');
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      throw new BadRequestException('Invalid withdrawal amount');
    }
    if (amount < MIN_WITHDRAWAL_MAJOR) {
      throw new BadRequestException(`Minimum withdrawal is ${MIN_WITHDRAWAL_MAJOR}`);
    }

    const amountMinor = Math.round(amount * 100);
    if (amountMinor <= 0) {
      throw new BadRequestException('Invalid withdrawal amount');
    }

    const provider = await this.paymentProviderResolver.ensureUserPaymentProvider(userId);
    const currency = provider === 'PAGBANK' ? 'brl' : 'usd';

    if (provider === 'STRIPE') {
      await this.requireCanReceivePayments(userId);
    } else {
      const status = await this.pagBankService.getOnboardingStatus(userId);
      if (!status.canReceivePayments) {
        throw new BadRequestException(
          status.message || 'Complete PagBank onboarding before withdrawing.',
        );
      }
    }

    const balance = await this.walletService.getBalance(userId, { currency, provider });
    if (balance.availableBalanceMinor < amountMinor) {
      throw new BadRequestException(
        `Insufficient available balance. Available: ${balance.availableBalance.toFixed(2)}, requested: ${amount.toFixed(2)}. Pending (${balance.pendingBalance.toFixed(2)}) cannot be withdrawn until the 48h protection window ends.`,
      );
    }

    const withdrawal = await this.prisma.withdrawalRecord.create({
      data: {
        userId,
        withdrawAmount: amount,
        amountMinor,
        currency,
        provider,
        status: 'processing',
        processingAt: new Date(),
      },
    });

    try {
      await this.walletService.debitAvailableForWithdrawal({
        userId,
        amountMinor,
        currency,
        provider,
        withdrawalId: withdrawal.id,
        note: `Withdrawal request ${withdrawal.id}`,
      });

      let transferId: string;

      if (provider === 'PAGBANK') {
        const payout = await this.pagBankService.payoutToConnectedAccount({
          userId,
          amountMinor,
          currency,
          withdrawalId: withdrawal.id,
        });
        transferId = payout.transferId;
      } else {
        const destinationAccountId = await this.requireCanReceivePayments(userId);
        const transfer = await this.stripe.transfers.create(
          {
            amount: amountMinor,
            currency,
            destination: destinationAccountId,
            metadata: {
              type: 'seller_wallet_withdrawal',
              withdrawalId: withdrawal.id,
              userId,
            },
          },
          { idempotencyKey: `wallet-withdrawal-${withdrawal.id}` },
        );
        transferId = transfer.id;
      }

      const updated = await this.prisma.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: {
          status: 'success',
          transferId,
          txhash: transferId,
        },
      });

      try {
        await this.notificationService.sendNotificationToUser(
          userId,
          'Withdrawal Successful',
          `Your withdrawal of ${amount.toFixed(2)} ${currency.toUpperCase()} has been sent to your connected account.`,
          {
            type: 'withdrawal_success',
            withdrawalId: withdrawal.id,
            amount: amount.toString(),
            transferId,
            provider,
          },
        );
      } catch (notificationError) {
        console.error('Failed to send withdrawal success notification:', notificationError);
      }

      const nextBalance = await this.walletService.getBalance(userId, { currency, provider });

      return {
        message: 'Withdrawal sent to your connected account',
        withdrawal: {
          id: updated.id,
          amount: updated.withdrawAmount,
          amountMinor: updated.amountMinor,
          currency: updated.currency,
          provider: updated.provider,
          status: updated.status,
          transferId: updated.transferId,
          createdAt: updated.createdAt,
        },
        balance: {
          pendingBalance: nextBalance.pendingBalance,
          availableBalance: nextBalance.availableBalance,
          withdrawableBalance: nextBalance.withdrawableBalance,
        },
      };
    } catch (error: any) {
      const failureReason = error?.message || 'Withdrawal transfer failed';

      try {
        await this.walletService.reverseWithdrawal({
          userId,
          amountMinor,
          currency,
          provider,
          withdrawalId: withdrawal.id,
          note: failureReason,
        });
      } catch (reverseError) {
        console.error('Failed to reverse wallet debit after withdrawal error:', reverseError);
      }

      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: {
          status: error?.message?.includes('onboarding') || error?.message?.includes('Complete')
            ? 'requires_onboarding'
            : 'failed',
          failureReason,
        },
      });

      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(failureReason);
    }
  }

  async getWithdrawalHistory(userId: string) {
    const withdrawals = await this.prisma.withdrawalRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: w.withdrawAmount,
        amountMinor: w.amountMinor,
        currency: w.currency,
        provider: w.provider,
        status: w.status,
        transferId: w.transferId || w.txhash,
        failureReason: w.failureReason,
        processingAt: w.processingAt,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    };
  }

  /** @deprecated Prefer requestWithdrawal which transfers immediately. */
  async processWithdrawal(_withdrawalId: string) {
    return;
  }

  // Generate provider onboarding link (Stripe Connect or PagBank Connect).
  // We create and persist stripeAccountId on first Stripe link request. If the user closes the
  // onboarding URL without completing, we keep the same account and issue a new link
  // next time (links expire ~30 min). Withdrawals are only allowed when onboarding is
  // complete (requireCanReceivePayments checks details_submitted).
  async createAccountOnboardingLink(userId: string) {
    const provider = await this.paymentProviderResolver.ensureUserPaymentProvider(userId);

    if (provider === 'PAGBANK') {
      return this.pagBankService.createAccountOnboardingLink(userId);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    let stripeAccountId = user.stripeAccountId;
    if (!stripeAccountId) {
      try {
        const account = await this.stripe.accounts.create({
          type: 'express',
          country: user.country && user.country !== 'BR' ? user.country : 'US',
          email: user.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
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
    } else {
      await this.stripe.accounts.update(stripeAccountId, {
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
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

      return { onboardingUrl: accountLink.url, provider: 'STRIPE' as const };
    } catch (error: any) {
      console.error('Error creating account link:', error.message);
      throw new BadRequestException('Failed to create onboarding link. Please try again later.');
    }
  }

  async handlePagBankConnectCallback(code: string, state: string) {
    return this.pagBankService.handleConnectCallback({ code, state });
  }

  // Handle payout success/failure webhooks (Connect account → bank).
  // Seller wallet withdrawal completes when the Transfer to Connect succeeds.
  async handlePayoutPaid(payout: Stripe.Payout) {
    const withdrawal = await this.findWithdrawalByPayoutOrTransfer(payout);
    if (!withdrawal) return;

    if (withdrawal.status !== 'success') {
      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: { status: 'success' },
      });
    }

    try {
      await this.notificationService.sendNotificationToUser(
        withdrawal.userId,
        'Payout Deposited',
        `Your withdrawal of $${withdrawal.withdrawAmount} is being deposited to your bank.`,
        {
          type: 'withdrawal_payout_paid',
          withdrawalId: withdrawal.id,
          amount: (withdrawal.withdrawAmount || 0).toString(),
        },
      );
    } catch (notificationError) {
      console.error('Failed to send payout paid notification:', notificationError);
    }
  }

  async handlePayoutFailed(payout: Stripe.Payout) {
    // Money already left the platform wallet to Connect; bank payout failure should not
    // re-credit the in-app available balance.
    const withdrawal = await this.findWithdrawalByPayoutOrTransfer(payout);
    if (!withdrawal) return;

    await this.prisma.withdrawalRecord.update({
      where: { id: withdrawal.id },
      data: {
        failureReason: `Connect payout failed: ${payout.failure_message || payout.failure_code || 'unknown'}`,
      },
    });

    try {
      await this.notificationService.sendNotificationToUser(
        withdrawal.userId,
        'Bank Payout Issue',
        'Your connected account payout to bank had an issue. Funds remain on your Stripe account — check onboarding/bank details.',
        {
          type: 'withdrawal_payout_failed',
          withdrawalId: withdrawal.id,
          amount: (withdrawal.withdrawAmount || 0).toString(),
        },
      );
    } catch (notificationError) {
      console.error('Failed to send payout failed notification:', notificationError);
    }
  }

  async handleTransferCreated(transfer: Stripe.Transfer) {
    const withdrawalId = transfer.metadata?.withdrawalId;
    const withdrawal = withdrawalId
      ? await this.prisma.withdrawalRecord.findUnique({ where: { id: withdrawalId } })
      : await this.prisma.withdrawalRecord.findFirst({
        where: {
          OR: [{ transferId: transfer.id }, { txhash: transfer.id }],
        },
      });

    if (!withdrawal) return;

    if (withdrawal.status === 'processing' || withdrawal.status === 'processing_transfer') {
      await this.prisma.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: {
          status: 'success',
          transferId: transfer.id,
          txhash: transfer.id,
        },
      });
    }
  }

  async handleTransferFailedOrReversed(transfer: Stripe.Transfer, reason: string) {
    const withdrawalId = transfer.metadata?.withdrawalId;
    const withdrawal = withdrawalId
      ? await this.prisma.withdrawalRecord.findUnique({ where: { id: withdrawalId } })
      : await this.prisma.withdrawalRecord.findFirst({
        where: {
          OR: [{ transferId: transfer.id }, { txhash: transfer.id }],
        },
      });

    if (!withdrawal) return;
    if (withdrawal.status === 'failed') return;

    const amountMinor =
      withdrawal.amountMinor ??
      Math.round(Number(withdrawal.withdrawAmount || 0) * 100);

    if (amountMinor > 0) {
      await this.walletService.reverseWithdrawal({
        userId: withdrawal.userId,
        amountMinor,
        currency: withdrawal.currency || 'usd',
        provider: (withdrawal.provider as 'STRIPE' | 'PAGBANK') || 'STRIPE',
        withdrawalId: withdrawal.id,
        note: reason,
      });
    }

    await this.prisma.withdrawalRecord.update({
      where: { id: withdrawal.id },
      data: {
        status: 'failed',
        failureReason: reason,
        transferId: transfer.id,
        txhash: transfer.id,
      },
    });

    try {
      await this.notificationService.sendNotificationToUser(
        withdrawal.userId,
        'Withdrawal Failed',
        `Your withdrawal of $${withdrawal.withdrawAmount} failed and was returned to your available balance.`,
        {
          type: 'withdrawal_failed',
          withdrawalId: withdrawal.id,
          amount: (withdrawal.withdrawAmount || 0).toString(),
        },
      );
    } catch (notificationError) {
      console.error('Failed to send withdrawal failed notification:', notificationError);
    }
  }

  private async findWithdrawalByPayoutOrTransfer(payout: Stripe.Payout) {
    return this.prisma.withdrawalRecord.findFirst({
      where: {
        OR: [
          { txhash: payout.id },
          { transferId: payout.id },
          ...(typeof (payout as any).balance_transaction === 'string'
            ? [{ txhash: (payout as any).balance_transaction as string }]
            : []),
        ],
      },
    });
  }

  async buyHit(amount: number, hitCount: number, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!hitCount || hitCount <= 0) throw new BadRequestException('hitCount must be greater than 0');
    if (!amount || amount <= 0) throw new BadRequestException('amount must be greater than 0');

    const provider = await this.paymentProviderResolver.resolveProviderForUser(userId);
    const amountMinor = Math.round(amount * 100);

    if (provider === 'PAGBANK') {
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: Math.round(amount),
          totalAmount: Math.round(amount),
          currency: 'BRL',
          status: 'pending',
          forPayment: 'buyHit',
          // hitCount carried for PagBank webhook fulfillment
          stripeInvoiceId: String(hitCount),
        },
      });

      const checkout = await this.pagBankService.createPixCheckout({
        referenceId: payment.id,
        amountMinor,
        description: `Buy ${hitCount} Hits`,
        customerEmail: user.email || undefined,
        customerName: user.displayName || user.userName || undefined,
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: checkout.orderId },
      });

      return { sessionId: checkout.orderId, url: checkout.checkoutUrl, ...checkout };
    }

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
            unit_amount: amountMinor,
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

    await this.prisma.payment.create({
      data: {
        userId: userId,
        amount: amountMinor,
        currency: 'USD',
        status: 'pending',
        forPayment: 'buyHit',
        stripePaymentIntentId: (session.payment_intent as string) || session.id,
        stripeInvoiceId: String(hitCount),
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  private async resolveFansPageAmountMinor(): Promise<number> {
    const fromEnv = Number(process.env.FANS_PAGE_SUBSCRIPTION_AMOUNT_CENTS || 0);
    if (fromEnv > 0) return Math.round(fromEnv);
    const price = await this.stripe.prices.retrieve('price_1STKIwEfZnDK6m7OP2vahCdr');
    const amount = price.unit_amount || 0;
    if (amount <= 0) {
      throw new BadRequestException('Fans page subscription price amount is missing');
    }
    return amount;
  }

  async createFansPageSubscriptionCheckoutSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const provider = await this.paymentProviderResolver.resolveProviderForUser(userId);
    const amount = await this.resolveFansPageAmountMinor();

    if (provider === 'PAGBANK') {
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: Math.round(amount / 100),
          totalAmount: Math.round(amount / 100),
          currency: 'BRL',
          status: 'pending',
          forPayment: 'fanSubscription',
        },
      });

      const checkout = await this.pagBankService.createPixCheckout({
        referenceId: payment.id,
        amountMinor: amount,
        description: 'Fans Page Subscription',
        customerEmail: user.email || undefined,
        customerName: user.displayName || user.userName || undefined,
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: checkout.orderId },
      });

      return { sessionId: checkout.orderId, url: checkout.checkoutUrl, ...checkout };
    }

    const customerId = await this.ensureStripeCustomer(userId);

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

    await this.prisma.payment.create({
      data: {
        userId: userId,
        amount: amount,
        currency: 'USD',
        status: 'pending',
        forPayment: 'fanSubscription',
        stripePaymentIntentId: (session.payment_intent as string) || session.id,
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

    // console.log(`✅ Fans page subscription payment processed: User ${userId} fansPage set to 1`);
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

    const amountCents = session.amount_total || Number(session.metadata?.amount || 0) * 100;
    const receiverAmountCents =
      Number(session.metadata?.receiverAmountCents) ||
      Math.max(0, Math.round(amountCents * (1 - this.PLATFORM_FEE_PERCENT)));

    await this.creditSellerAvailableWallet({
      sellerUserId: buyUserId,
      amountMinor: receiverAmountCents,
      source: 'FAN_SUBSCRIPTION',
      refId: customPaymentIntentId,
      currency: session.currency || 'usd',
      note: `Fan subscription buy ${session.id}`,
    });
  }

  async createOneTimePaymentCheckForFanSubscription(amount: number, buyUserId: string, fanUserId: string) {
    if (!buyUserId) throw new BadRequestException('Creator user id is required');
    if (!fanUserId) throw new BadRequestException('Fan user id is required');
    if (buyUserId === fanUserId) throw new BadRequestException('You cannot buy your own fan subscription');
    if (!amount || amount <= 0) throw new BadRequestException('Amount must be greater than 0');

    await this.ensureUserExists(buyUserId);
    const fanProvider = await this.paymentProviderResolver.resolveProviderForUser(fanUserId);
    const buyUser = await this.prisma.user.findUnique({ where: { id: buyUserId } });
    if (!buyUser) throw new BadRequestException('Buy user not found');

    const customPaymentIntentId = uuidv4();
    const amountCents = Math.round(amount * 100);
    const applicationFeeCents = Math.round(amountCents * this.PLATFORM_FEE_PERCENT);
    const receiverAmountCents = Math.max(0, amountCents - applicationFeeCents);
    const receiverAmount = receiverAmountCents / 100;
    const platformFee = applicationFeeCents / 100;
    const totalAmount = amountCents / 100;

    const payment = await this.prisma.payment.create({
      data: {
        userId: buyUserId,
        receiverId: buyUserId,
        amount: receiverAmount,
        platformFee,
        totalAmount,
        currency: fanProvider === 'PAGBANK' ? 'BRL' : 'USD',
        status: 'pending',
        forPayment: 'fanSubscriptionBuy',
        stripePaymentIntentId: customPaymentIntentId,
        // PagBank webhook reads fan payer id from stripeInvoiceId
        stripeInvoiceId: fanUserId,
      },
    });

    if (fanProvider === 'PAGBANK') {
      const fan = await this.prisma.user.findUnique({
        where: { id: fanUserId },
        select: { email: true, displayName: true, userName: true },
      });
      const checkout = await this.pagBankService.createPixCheckout({
        referenceId: payment.id,
        amountMinor: amountCents,
        description: `Fan Subscription to ${buyUser.displayName || buyUser.userName}`,
        customerEmail: fan?.email || undefined,
        customerName: fan?.displayName || fan?.userName || undefined,
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: checkout.orderId },
      });
      return {
        sessionId: checkout.orderId,
        url: checkout.checkoutUrl,
        ...checkout,
      };
    }

    const customerId = await this.ensureStripeCustomer(fanUserId);

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
        metadata: {
          type: 'fan_subscription_buy',
          fanUserId,
          buyUserId,
          amount: amount.toString(),
          customPaymentIntentId,
          platformFeeCents: applicationFeeCents.toString(),
          receiverAmountCents: receiverAmountCents.toString(),
        },
      },
      metadata: {
        type: 'fan_subscription_buy',
        fanUserId,
        buyUserId,
        amount: amount.toString(),
        customPaymentIntentId,
        platformFeeCents: applicationFeeCents.toString(),
        receiverAmountCents: receiverAmountCents.toString(),
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  private getUtcYearMonth(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getNextUtcMonthStart(date: Date = new Date()): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  }

  async buyHitWithPlatformPoints(userId: string) {
    if (!userId) throw new BadRequestException('User not authenticated');

    const now = new Date();
    const yearMonth = this.getUtcYearMonth(now);
    const nextEligibleAt = this.getNextUtcMonthStart(now);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
            SELECT id
            FROM "User"
            WHERE id = ${userId}
            FOR UPDATE
          `;

          const user = await tx.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              totalPlatformPoints: true,
            },
          });

          if (!user) {
            throw new BadRequestException('User not found');
          }

          const existingPurchase = await tx.platformPointsHitPurchase.findUnique({
            where: {
              userId_yearMonth: {
                userId,
                yearMonth,
              },
            },
            select: { id: true },
          });

          if (existingPurchase) {
            throw new BadRequestException(
              `You can buy only 1 hit with platform points once per month. Next eligible at ${nextEligibleAt.toISOString()}`,
            );
          }

          const availablePoints = user.totalPlatformPoints ?? 0;
          if (availablePoints < PLATFORM_POINTS_HIT_COST) {
            throw new BadRequestException(
              `Insufficient platform points. Need ${PLATFORM_POINTS_HIT_COST}, have ${availablePoints}`,
            );
          }

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              totalPlatformPoints: { decrement: PLATFORM_POINTS_HIT_COST },
            },
            select: {
              totalPlatformPoints: true,
            },
          });

          const existingPostHit = await tx.postHit.findFirst({
            where: { userId },
            select: { id: true, hitLeft: true },
          });

          let hitLeft: number;
          if (existingPostHit) {
            const updatedPostHit = await tx.postHit.update({
              where: { id: existingPostHit.id },
              data: { hitLeft: { increment: PLATFORM_POINTS_HIT_COUNT } },
              select: { hitLeft: true },
            });
            hitLeft = updatedPostHit.hitLeft;
          } else {
            const createdPostHit = await tx.postHit.create({
              data: {
                userId,
                hitLeft: PLATFORM_POINTS_HIT_COUNT,
              },
              select: { hitLeft: true },
            });
            hitLeft = createdPostHit.hitLeft;
          }

          await tx.platformPointsHitPurchase.create({
            data: {
              userId,
              pointsSpent: PLATFORM_POINTS_HIT_COST,
              hitCount: PLATFORM_POINTS_HIT_COUNT,
              yearMonth,
            },
          });

          return {
            success: true,
            hitAdded: PLATFORM_POINTS_HIT_COUNT,
            pointsSpent: PLATFORM_POINTS_HIT_COST,
            hitLeft,
            totalPlatformPoints: updatedUser.totalPlatformPoints,
            yearMonth,
            nextEligibleAt,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (
        error?.code === 'P2002' ||
        (typeof error?.message === 'string' &&
          error.message.toLowerCase().includes('could not serialize access'))
      ) {
        throw new BadRequestException(
          `You can buy only 1 hit with platform points once per month. Next eligible at ${nextEligibleAt.toISOString()}`,
        );
      }

      throw error;
    }
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

    // console.log(`✅ Buy hit payment processed: User ${userId} received ${hitCount} hits`);
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
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Failed to add digital badge';
      throw new BadRequestException(message);
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

  async getUsdtTransfersReceived(receiverId: string, limit: number = 50) {
    const take = Math.min(Math.max(1, limit), 100);
    return this.prisma.digital_transaction.findMany({
      where: { receiverId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getReceivedTotals(userId: string) {
    const [payFollowingSum, tipSum, missionDonationSum, usdtSum, paidOrdersSummary, shopEbookSummary] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
        _sum: { amount: true },
      }),
      this.prisma.donationData.aggregate({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.digital_transaction.aggregate({
        where: { receiverId: userId },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          sellerId: userId,
          paymentStatus: 'PAID',
        },
        _sum: {
          total: true,
          serviceFee: true,
        },
      }),
      (this.prisma as any).shopEbookPayments.aggregate({
        where: {
          sellerId: userId,
          status: 'SUCCEEDED',
        },
        _sum: {
          sellerAmount: true,
        },
      }),
    ]);

    const totalShopItemsEarning =
      Number(paidOrdersSummary._sum.total || 0) - Number(paidOrdersSummary._sum.serviceFee || 0);
    const totalShopEbookEarning = Number(shopEbookSummary._sum.sellerAmount || 0) / 100;
    const totalShopEarning = totalShopItemsEarning + totalShopEbookEarning;

    const totalReceived =
      Number(payFollowingSum._sum.amount ?? 0)
      + Number(tipSum._sum.amount ?? 0)
      + Number(missionDonationSum._sum.amount ?? 0)
      + Number(usdtSum._sum.amount ?? 0)
      + totalShopEarning;

    return {
      totalReceived: Number(totalReceived.toFixed(2)),
      totalShopItemsEarning: Number(totalShopItemsEarning.toFixed(2)),
      totalShopEbookEarning: Number(totalShopEbookEarning.toFixed(2)),
      totalShopEarning: Number(totalShopEarning.toFixed(2)),
    };
  }

  private async getAllTimeEarningTotals(userId: string) {
    const [payFollowingSum, tipSum, missionDonationSum, usdtSum, paidOrdersSummary, shopEbookSummary] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
        _sum: { amount: true },
      }),
      this.prisma.donationData.aggregate({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.digital_transaction.aggregate({
        where: { receiverId: userId },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          sellerId: userId,
          paymentStatus: 'PAID',
        },
        _sum: {
          total: true,
          serviceFee: true,
        },
      }),
      (this.prisma as any).shopEbookPayments.aggregate({
        where: {
          sellerId: userId,
          status: 'SUCCEEDED',
        },
        _sum: {
          sellerAmount: true,
        },
      }),
    ]);

    const payFollowingTotalAllTime = Number(payFollowingSum._sum.amount ?? 0);
    const tipTotalAllTime = Number(tipSum._sum.amount ?? 0);
    const missionDonationTotalAllTime = Number(missionDonationSum._sum.amount ?? 0);
    const usdtTotalAllTime = Number(usdtSum._sum.amount ?? 0);
    const totalShopItemsEarningAllTime = Number(
      (Number(paidOrdersSummary._sum.total || 0) - Number(paidOrdersSummary._sum.serviceFee || 0)).toFixed(2),
    );
    const totalShopEbookEarningAllTime = Number((Number(shopEbookSummary._sum.sellerAmount || 0) / 100).toFixed(2));
    const totalShopEarningAllTime = Number((totalShopItemsEarningAllTime + totalShopEbookEarningAllTime).toFixed(2));

    const totalEarningAllTime = Number((
      payFollowingTotalAllTime
      + tipTotalAllTime
      + missionDonationTotalAllTime
      + usdtTotalAllTime
      + totalShopEarningAllTime
    ).toFixed(2));

    return {
      payFollowingTotalAllTime,
      tipTotalAllTime,
      missionDonationTotalAllTime,
      usdtTotalAllTime,
      totalShopItemsEarningAllTime,
      totalShopEbookEarningAllTime,
      totalShopEarningAllTime,
      totalEarningAllTime,
    };
  }

  async getPayFollowingGraph(userId: string) {
    const now = new Date();
    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 6,
      0,
      0,
      0,
      0,
    ));

    const [payFollowingRows] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const dayAmountMap = new Map<string, number>();
    const labels: string[] = [];

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + i,
        0,
        0,
        0,
        0,
      ));
      const key = day.toISOString().slice(0, 10);
      labels.push(key);
      dayAmountMap.set(key, 0);
    }

    payFollowingRows.forEach((row) => {
      const key = row.createdAt.toISOString().slice(0, 10);
      const current = dayAmountMap.get(key) || 0;
      dayAmountMap.set(key, current + Number(row.amount || 0));
    });

    const graphData = labels.map((date) => ({
      date,
      amount: Number((dayAmountMap.get(date) || 0).toFixed(2)),
    }));

    const totals = await this.getAllTimeEarningTotals(userId);
    const payFollowingTotal = totals.payFollowingTotalAllTime;
    const totalEarning = totals.totalEarningAllTime;

    const payFollowingPercentageOfTotalEarning =
      totalEarning > 0 ? Number(((payFollowingTotal / totalEarning) * 100).toFixed(2)) : 0;

    return {
      range: '7d',
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      payFollowingTotal,
      totalEarning,
      payFollowingPercentageOfTotalEarning,
      graphData,
    };
  }

  async getTipGraph(userId: string) {
    const now = new Date();
    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 6,
      0,
      0,
      0,
      0,
    ));

    const [tipRows] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const dayAmountMap = new Map<string, number>();
    const labels: string[] = [];

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + i,
        0,
        0,
        0,
        0,
      ));
      const key = day.toISOString().slice(0, 10);
      labels.push(key);
      dayAmountMap.set(key, 0);
    }

    tipRows.forEach((row) => {
      const key = row.createdAt.toISOString().slice(0, 10);
      const current = dayAmountMap.get(key) || 0;
      dayAmountMap.set(key, current + Number(row.amount || 0));
    });

    const graphData = labels.map((date) => ({
      date,
      amount: Number((dayAmountMap.get(date) || 0).toFixed(2)),
    }));

    const totals = await this.getAllTimeEarningTotals(userId);
    const totalTipEarning = totals.tipTotalAllTime;
    const totalEarning = totals.totalEarningAllTime;

    const tipPercentageOfTotalEarning =
      totalEarning > 0 ? Number(((totalTipEarning / totalEarning) * 100).toFixed(2)) : 0;

    return {
      range: '7d',
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalTipEarning,
      totalEarning,
      tipPercentageOfTotalEarning,
      graphData,
    };
  }

  async getTotalTipEarningByUserId(userId: string) {
    const normalizedUserId = (userId || '').trim();
    if (!normalizedUserId) {
      throw new BadRequestException('User ID is required');
    }

    await this.ensureUserExists(normalizedUserId);

    const tipSummary = await this.prisma.payment.aggregate({
      where: {
        receiverId: normalizedUserId,
        forPayment: 'TIP',
        status: 'succeeded',
      },
      _sum: {
        amount: true,
      },
    });

    const totalTipEarning = Number(Number(tipSummary._sum.amount ?? 0).toFixed(2));

    return {
      userId: normalizedUserId,
      totalTipEarning,
    };
  }

  async getMissionDonationsGraph(userId: string) {
    const now = new Date();
    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 6,
      0,
      0,
      0,
      0,
    ));

    const [missionDonationRows] = await Promise.all([
      this.prisma.donationData.findMany({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const dayAmountMap = new Map<string, number>();
    const labels: string[] = [];

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + i,
        0,
        0,
        0,
        0,
      ));
      const key = day.toISOString().slice(0, 10);
      labels.push(key);
      dayAmountMap.set(key, 0);
    }

    missionDonationRows.forEach((row) => {
      const key = row.createdAt.toISOString().slice(0, 10);
      const current = dayAmountMap.get(key) || 0;
      dayAmountMap.set(key, current + Number(row.amount || 0));
    });

    const graphData = labels.map((date) => ({
      date,
      amount: Number((dayAmountMap.get(date) || 0).toFixed(2)),
    }));

    const totals = await this.getAllTimeEarningTotals(userId);
    const totalMissionDonationsEarning = totals.missionDonationTotalAllTime;
    const totalEarning = totals.totalEarningAllTime;

    const missionDonationsPercentageOfTotalEarning =
      totalEarning > 0 ? Number(((totalMissionDonationsEarning / totalEarning) * 100).toFixed(2)) : 0;

    return {
      range: '7d',
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalMissionDonationsEarning,
      totalEarning,
      missionDonationsPercentageOfTotalEarning,
      graphData,
    };
  }

  async getShopEarningGraph(userId: string) {
    const now = new Date();
    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 6,
      0,
      0,
      0,
      0,
    ));

    const [paidOrders, shopEbookPayments] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          sellerId: userId,
          paymentStatus: 'PAID',
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          total: true,
          serviceFee: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      (this.prisma as any).shopEbookPayments.findMany({
        where: {
          sellerId: userId,
          status: 'SUCCEEDED',
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          sellerAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const dayAmountMap = new Map<string, number>();
    const labels: string[] = [];

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + i,
        0,
        0,
        0,
        0,
      ));
      const key = day.toISOString().slice(0, 10);
      labels.push(key);
      dayAmountMap.set(key, 0);
    }

    paidOrders.forEach((order) => {
      const key = order.createdAt.toISOString().slice(0, 10);
      const netOrderEarning = Number(order.total || 0) - Number(order.serviceFee || 0);
      const current = dayAmountMap.get(key) || 0;
      dayAmountMap.set(key, current + netOrderEarning);
    });

    shopEbookPayments.forEach((payment: any) => {
      const key = payment.createdAt.toISOString().slice(0, 10);
      // sellerAmount is stored in minor units; convert to major units.
      const netEbookEarning = Number(payment.sellerAmount || 0) / 100;
      const current = dayAmountMap.get(key) || 0;
      dayAmountMap.set(key, current + netEbookEarning);
    });

    const graphData = labels.map((date) => ({
      date,
      amount: Number((dayAmountMap.get(date) || 0).toFixed(2)),
    }));

    const totals = await this.getAllTimeEarningTotals(userId);
    const totalShopItemsEarning = totals.totalShopItemsEarningAllTime;
    const totalShopEbookEarning = totals.totalShopEbookEarningAllTime;
    const totalShopEarning = totals.totalShopEarningAllTime;
    const totalEarning = totals.totalEarningAllTime;

    const shopEarningPercentageOfTotalEarning =
      totalEarning > 0 ? Number(((totalShopEarning / totalEarning) * 100).toFixed(2)) : 0;

    return {
      range: '7d',
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalShopEarning,
      totalShopItemsEarning,
      totalShopEbookEarning,
      totalEarning,
      shopEarningPercentageOfTotalEarning,
      graphData,
    };
  }

  async getUsdtTransferGraph(userId: string) {
    const now = new Date();
    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 6,
      0,
      0,
      0,
      0,
    ));

    const [usdtRows] = await Promise.all([
      this.prisma.digital_transaction.findMany({
        where: {
          receiverId: userId,
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const dayAmountMap = new Map<string, number>();
    const labels: string[] = [];

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + i,
        0,
        0,
        0,
        0,
      ));
      const key = day.toISOString().slice(0, 10);
      labels.push(key);
      dayAmountMap.set(key, 0);
    }

    usdtRows.forEach((row) => {
      const key = row.createdAt.toISOString().slice(0, 10);
      const current = dayAmountMap.get(key) || 0;
      dayAmountMap.set(key, current + Number(row.amount || 0));
    });

    const graphData = labels.map((date) => ({
      date,
      amount: Number((dayAmountMap.get(date) || 0).toFixed(2)),
    }));

    const totals = await this.getAllTimeEarningTotals(userId);
    const totalUsdtTransferEarning = totals.usdtTotalAllTime;
    const totalEarning = totals.totalEarningAllTime;

    const usdtTransferPercentageOfTotalEarning =
      totalEarning > 0 ? Number(((totalUsdtTransferEarning / totalEarning) * 100).toFixed(2)) : 0;

    return {
      range: '7d',
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalUsdtTransferEarning,
      totalEarning,
      usdtTransferPercentageOfTotalEarning,
      graphData,
    };
  }

  async getReceivedTotalsTransactions(userId: string, page: number = 1, limit: number = 10) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(Math.max(1, limit || 10), 50);
    const takePerSource = safePage * safeLimit;

    const [
      followingPayments,
      tipPayments,
      missionDonations,
      usdtTransfers,
      totalFollowingPayments,
      totalTipPayments,
      totalMissionDonations,
      totalUsdtTransfers,
      followingPaymentsSummary,
      tipPaymentsSummary,
      missionDonationsSummary,
      usdtTransfersSummary,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.payment.findMany({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.donationData.findMany({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.digital_transaction.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.payment.count({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
        },
      }),
      this.prisma.payment.count({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
      }),
      this.prisma.donationData.count({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
      }),
      this.prisma.digital_transaction.count({
        where: { receiverId: userId },
      }),
      this.prisma.payment.aggregate({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
        },
        _sum: {
          amount: true,
          platformFee: true,
          totalAmount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
        _sum: {
          amount: true,
          platformFee: true,
          totalAmount: true,
        },
      }),
      this.prisma.donationData.aggregate({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        _sum: {
          amount: true,
          totalAmount: true,
          platformFees: true,
        },
      }),
      this.prisma.digital_transaction.aggregate({
        where: { receiverId: userId },
        _sum: { amount: true },
      }),
    ]);

    const combined = [
      ...followingPayments.map((p) => ({ ...p, typeTransaction: 'payFollowing' })),
      ...tipPayments.map((p) => ({ ...p, typeTransaction: 'tip' })),
      ...missionDonations.map((d) => ({ ...d, typeTransaction: 'donation' })),
      ...usdtTransfers.map((t) => ({ ...t, typeTransaction: 'usdt' })),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (safePage - 1) * safeLimit;
    const end = start + safeLimit;
    const transactions = combined.slice(start, end);

    const totalItems =
      totalFollowingPayments
      + totalTipPayments
      + totalMissionDonations
      + totalUsdtTransfers;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safeLimit);

    const payFollowingUserReceived = Number(followingPaymentsSummary._sum.amount ?? 0);
    const tipUserReceived = Number(tipPaymentsSummary._sum.amount ?? 0);
    const donationUserReceived = Number(missionDonationsSummary._sum.amount ?? 0);
    const usdtUserReceived = Number(usdtTransfersSummary._sum.amount ?? 0);

    const payFollowingPlatformFee = Number(followingPaymentsSummary._sum.platformFee ?? 0);
    const tipPlatformFee = Number(tipPaymentsSummary._sum.platformFee ?? 0);
    const donationPlatformFee = Number(missionDonationsSummary._sum.platformFees ?? 0);

    const payFollowingTotalAmount = Number(
      followingPaymentsSummary._sum.totalAmount
      ?? (payFollowingUserReceived + payFollowingPlatformFee),
    );
    const tipTotalAmount = Number(
      tipPaymentsSummary._sum.totalAmount
      ?? (tipUserReceived + tipPlatformFee),
    );
    const donationTotalAmount = Number(
      missionDonationsSummary._sum.totalAmount
      ?? (donationUserReceived + donationPlatformFee),
    );
    const usdtTotalAmount = usdtUserReceived;

    const userReceived = payFollowingUserReceived + tipUserReceived + donationUserReceived + usdtUserReceived;
    const platformFee = payFollowingPlatformFee + tipPlatformFee + donationPlatformFee;
    const totalAmount = payFollowingTotalAmount + tipTotalAmount + donationTotalAmount + usdtTotalAmount;

    return {
      totalAmount,
      userReceived,
      platformFee,
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      transactions,
    };
  }

  async getReceivedTransactions(userId: string, page: number = 1, limit: number = 10) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(Math.max(1, limit || 10), 50);
    const takePerSource = safePage * safeLimit;

    const [
      followingPaymentsCredit,
      followingPaymentsDebit,
      tipPaymentsCredit,
      tipPaymentsDebit,
      donationsCredit,
      donationsDebit,
      usdtTransfersCredit,
      usdtTransfersDebit,
      totalFollowingPaymentsCredit,
      totalFollowingPaymentsDebit,
      totalTipPaymentsCredit,
      totalTipPaymentsDebit,
      totalDonationsCredit,
      totalDonationsDebit,
      totalUsdtTransfersCredit,
      totalUsdtTransfersDebit,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.payment.findMany({
        where: {
          userId,
          forPayment: 'following',
          status: 'succeeded',
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.payment.findMany({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.payment.findMany({
        where: {
          userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.donationData.findMany({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.donationData.findMany({
        where: {
          userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.digital_transaction.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.digital_transaction.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: takePerSource,
      }),
      this.prisma.payment.count({
        where: {
          receiverId: userId,
          forPayment: 'following',
          status: 'succeeded',
        },
      }),
      this.prisma.payment.count({
        where: {
          userId,
          forPayment: 'following',
          status: 'succeeded',
        },
      }),
      this.prisma.payment.count({
        where: {
          receiverId: userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
      }),
      this.prisma.payment.count({
        where: {
          userId,
          forPayment: 'TIP',
          status: 'succeeded',
        },
      }),
      this.prisma.donationData.count({
        where: {
          vendorId: userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
      }),
      this.prisma.donationData.count({
        where: {
          userId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
      }),
      this.prisma.digital_transaction.count({
        where: { receiverId: userId },
      }),
      this.prisma.digital_transaction.count({
        where: { senderId: userId },
      }),
    ]);

    const combined = [
      ...followingPaymentsCredit.map((p) => ({ ...p, typeTransaction: 'payFollowing', type: 'credit' })),
      ...followingPaymentsDebit.map((p) => ({ ...p, typeTransaction: 'payFollowing', type: 'debit' })),
      ...tipPaymentsCredit.map((p) => ({ ...p, typeTransaction: 'tip', type: 'credit' })),
      ...tipPaymentsDebit.map((p) => ({ ...p, typeTransaction: 'tip', type: 'debit' })),
      ...donationsCredit.map((d) => ({ ...d, typeTransaction: 'donation', type: 'credit' })),
      ...donationsDebit.map((d) => ({ ...d, typeTransaction: 'donation', type: 'debit' })),
      ...usdtTransfersCredit.map((t) => ({ ...t, typeTransaction: 'usdt', type: 'credit' })),
      ...usdtTransfersDebit.map((t) => ({ ...t, typeTransaction: 'usdt', type: 'debit' })),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (safePage - 1) * safeLimit;
    const end = start + safeLimit;
    const transactions = combined.slice(start, end);

    const totalItems =
      totalFollowingPaymentsCredit
      + totalFollowingPaymentsDebit
      + totalTipPaymentsCredit
      + totalTipPaymentsDebit
      + totalDonationsCredit
      + totalDonationsDebit
      + totalUsdtTransfersCredit
      + totalUsdtTransfersDebit;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safeLimit);

    return {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      transactions,
    };
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

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new BadRequestException('Transaction not found or not yet mined');
      }

      if (receipt.status !== 1) {
        throw new BadRequestException('Transaction failed on-chain');
      }

      const normalizedUsdt = ethers.getAddress(usdtAddress);
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
        matchedTransfer = { from, to, value };
        break;
      }

      if (!matchedTransfer) {
        throw new BadRequestException('USDT transfer not found in transaction logs');
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
      const message = error instanceof Error ? error.message : 'Failed to verify transaction';
      throw new BadRequestException(message);
    }
  }
}

