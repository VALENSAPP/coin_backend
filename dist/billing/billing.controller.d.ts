import { BillingService } from './billing.service';
import { Request } from 'express';
export declare class RequestWithdrawalDto {
    amount: number;
    bankDetails: {
        accountNumber: string;
        routingNumber: string;
        accountHolderName: string;
        bankName: string;
    };
}
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
        }[];
    }>;
    requestWithdrawal(req: Request, dto: RequestWithdrawalDto): Promise<{
        message: string;
        withdrawalId: string;
        amount: number;
        status: string;
    }>;
    getWithdrawalHistory(req: Request): Promise<{
        withdrawals: {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            withdrawAmount: number | null;
            txhash: string | null;
        }[];
    }>;
    createOnboardingLink(req: Request): Promise<{
        onboardingUrl: string;
    }>;
}
