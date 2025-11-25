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
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        amount: number;
        currency: string;
        stripePaymentIntentId: string | null;
        stripeInvoiceId: string | null;
        forPayment: string;
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
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
            userName: string | null;
            image: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.FansSubscriptionStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fanUserId: string;
        buyUserId: string;
        startDate: Date;
        endDate: Date;
    })[]>;
    fanSubscriptionUserList(userId: string): Promise<({
        buyUser: {
            userName: string | null;
            image: string | null;
            id: string;
        };
    } & {
        status: import(".prisma/client").$Enums.FansSubscriptionStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fanUserId: string;
        buyUserId: string;
        startDate: Date;
        endDate: Date;
    })[]>;
    userTransactionHistory(userId: string, transactionType: string): Promise<{
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        amount: number;
        currency: string;
        stripePaymentIntentId: string | null;
        stripeInvoiceId: string | null;
        forPayment: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }[] | {
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        withdrawAmount: number | null;
        txhash: string | null;
        failureReason: string | null;
        processingAt: Date | null;
    }[] | {
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        transactionHash: string;
        tokenAddress: string;
        vendorId: string;
        amountTokens: string;
        sellAmount: number;
        actualReceivedAmount: number | null;
        adminFeeAmount: number | null;
    }[] | {
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        completedAt: Date | null;
        vendorId: string | null;
        amount: number;
        currency: string;
        platformFee: number;
        vendorFee: number;
        restAmount: number;
        tokensReceived: number;
        stripePaymentIntentId: string | null;
        stripeCheckoutSessionId: string | null;
        purchaseTokenPrice: number | null;
        stripeInvoiceId: string | null;
        action: string;
    }[] | ({
        typeTransaction: string;
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        withdrawAmount: number | null;
        txhash: string | null;
        failureReason: string | null;
        processingAt: Date | null;
    } | {
        typeTransaction: string;
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        transactionHash: string;
        tokenAddress: string;
        vendorId: string;
        amountTokens: string;
        sellAmount: number;
        actualReceivedAmount: number | null;
        adminFeeAmount: number | null;
    } | {
        typeTransaction: string;
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        completedAt: Date | null;
        vendorId: string | null;
        amount: number;
        currency: string;
        platformFee: number;
        vendorFee: number;
        restAmount: number;
        tokensReceived: number;
        stripePaymentIntentId: string | null;
        stripeCheckoutSessionId: string | null;
        purchaseTokenPrice: number | null;
        stripeInvoiceId: string | null;
        action: string;
    } | {
        typeTransaction: string;
        userId: string;
        status: string;
        id: string;
        createdAt: Date;
        amount: number;
        currency: string;
        stripePaymentIntentId: string | null;
        stripeInvoiceId: string | null;
        forPayment: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    })[]>;
}
