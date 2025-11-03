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
        id: string;
        createdAt: Date;
        status: string;
        currency: string;
        amount: number;
        forPayment: string;
        stripeInvoiceId: string | null;
        stripePaymentIntentId: string | null;
        periodStart: Date | null;
        periodEnd: Date | null;
    }[]>;
    requestWithdrawal(userId: string, amount: number, bankDetails: any): Promise<{
        message: string;
        withdrawalId: string;
        amount: number;
        status: string;
    }>;
    getWithdrawalHistory(userId: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        withdrawAmount: number | null;
        txhash: string | null;
    }[]>;
    processWithdrawal(withdrawalId: string): Promise<{
        success: boolean;
        payoutId: string;
    }>;
    createAccountOnboardingLink(userId: string): Promise<{
        onboardingUrl: string;
    }>;
    handlePayoutPaid(payout: Stripe.Payout): Promise<void>;
    handlePayoutFailed(payout: Stripe.Payout): Promise<void>;
}
