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
    getMySubscription(req: Request): Promise<{
        subscription: {
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            start: Date | null;
            end: Date | null;
            currentPeriodEnd: Date | null;
        };
    }>;
}
