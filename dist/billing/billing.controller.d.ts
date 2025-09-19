import { BillingService } from './billing.service';
import { Request } from 'express';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    createSubscription(req: Request): Promise<{
        url: string | null;
    }>;
    cancelSubscription(req: Request): Promise<{
        message: string;
        result: import("stripe").Stripe.Response<import("stripe").Stripe.Subscription>;
    }>;
    createOneTimePayment(req: Request, body: {
        amount: number;
    }): Promise<{
        url: string | null;
    }>;
    getMySubscription(req: Request): Promise<{
        subscription: {
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            start: Date | null;
            end: Date | null;
            currentPeriodEnd: Date | null;
        };
    }>;
    getLatestTransactions(req: Request): Promise<{
        transactions: {
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
        }[];
    }>;
}
