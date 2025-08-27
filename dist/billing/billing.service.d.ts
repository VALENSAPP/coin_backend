import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
export declare class BillingService {
    private readonly prisma;
    private stripe;
    constructor(prisma: PrismaService);
    ensureStripeCustomer(userId: string): Promise<string>;
    createCheckoutSession(userId: string, dto: {
        priceId: string;
        successUrl: string;
        cancelUrl: string;
        quantity?: number;
    }): Promise<Stripe.Response<Stripe.Checkout.Session>>;
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
}
