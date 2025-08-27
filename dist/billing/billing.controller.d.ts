import { BillingService } from './billing.service';
import { Request } from 'express';
declare class CreateSubscriptionDto {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    quantity?: number;
}
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    createSubscription(req: Request, dto: CreateSubscriptionDto): Promise<{
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
export {};
