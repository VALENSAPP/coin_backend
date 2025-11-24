import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
export declare class BillingService {
    private readonly prisma;
    private stripe;
    constructor(prisma: PrismaService);
    ensureStripeCustomer(userId: string): Promise<string>;
    createCheckoutSession(userId: string): Promise<Stripe.Response<Stripe.Checkout.Session>>;
    createOneTimePaymentCheckoutSession(userId: string, amount: number): Promise<Stripe.Response<Stripe.Checkout.Session>>;
    cancelSubscriptionAtPeriodEnd(userId: string): Promise<Stripe.Response<Stripe.Subscription>>;
    getSubscriptionDetails(userId: string): Promise<{
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        start: Date | null;
        end: Date | null;
        currentPeriodEnd: Date | null;
    }>;
    handleInvoicePaid(invoice: Stripe.Invoice): Promise<void>;
    handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void>;
    handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void>;
    handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void>;
    handleOneTimePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void>;
    getLatestTransactions(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        currency: string;
        amount: number;
        status: string;
        forPayment: string;
        stripeInvoiceId: string | null;
        stripePaymentIntentId: string | null;
        periodStart: Date | null;
        periodEnd: Date | null;
    }[]>;
    requestWithdrawal(userId: string, amount: number): Promise<{
        message: string;
        withdrawalId: string;
        amount: number;
        status: string;
    }>;
    getWithdrawalHistory(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        withdrawAmount: number | null;
        txhash: string | null;
        failureReason: string | null;
        processingAt: Date | null;
    }[]>;
    processWithdrawal(withdrawalId: string): Promise<{
        success: boolean;
        reason: string;
        transferId?: undefined;
    } | {
        success: boolean;
        transferId: string;
        reason?: undefined;
    }>;
    createAccountOnboardingLink(userId: string): Promise<{
        onboardingUrl: string;
    }>;
    handlePayoutPaid(payout: Stripe.Payout): Promise<void>;
    handlePayoutFailed(payout: Stripe.Payout): Promise<void>;
    handleTransferCreated(transfer: Stripe.Transfer): Promise<void>;
    buyHit(amount: number, hitCount: number, userId: string): Promise<{
        sessionId: string;
        url: string | null;
    }>;
    createFansPageSubscriptionCheckoutSession(userId: string): Promise<{
        sessionId: string;
        url: string | null;
    }>;
    handleFansPageSubscriptionPayment(session: Stripe.Checkout.Session): Promise<void>;
    handleFanSubscriptionBuyPayment(session: Stripe.Checkout.Session): Promise<void>;
    createOneTimePaymentCheckForFanSubscription(amount: number, buyUserId: string, fanUserId: string): Promise<{
        sessionId: string;
        url: string | null;
    }>;
    handleBuyHitPayment(session: Stripe.Checkout.Session): Promise<void>;
    processPendingWithdrawals(): Promise<void>;
    getUserBuyFanSubscriptionList(userId: string): Promise<({
        fanUser: {
            image: string | null;
            userName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FansSubscriptionStatus;
        fanUserId: string;
        buyUserId: string;
        startDate: Date;
        endDate: Date;
    })[]>;
    fanSubscriptionUserList(userId: string): Promise<({
        buyUser: {
            id: string;
            image: string | null;
            userName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FansSubscriptionStatus;
        fanUserId: string;
        buyUserId: string;
        startDate: Date;
        endDate: Date;
    })[]>;
}
