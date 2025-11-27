import { BillingService } from './billing.service';
import { Request } from 'express';
import { BuyHitDto } from './dto/buy-hit.dto';
import { BuyFanSubscriptionDto } from './dto/buy-fan-subscription.dto';
export declare class RequestWithdrawalDto {
    amount: number;
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
    requestWithdrawal(req: Request, dto: RequestWithdrawalDto): Promise<{
        message: string;
        withdrawalId: string;
        amount: number;
        status: string;
    }>;
    getWithdrawalHistory(req: Request): Promise<{
        withdrawals: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: string;
            withdrawAmount: number | null;
            txhash: string | null;
            failureReason: string | null;
            processingAt: Date | null;
        }[];
    }>;
    createOnboardingLink(req: Request): Promise<{
        onboardingUrl: string;
    }>;
    buyHit(req: Request, dto: BuyHitDto): Promise<{
        sessionId: string;
        url: string | null;
        message: string;
    }>;
    fansPageSubscription(req: Request): Promise<{
        url: string | null;
    }>;
    buyFanSubscription(req: Request, dto: BuyFanSubscriptionDto): Promise<{
        sessionId: string;
        url: string | null;
        message: string;
    }>;
    getUserBuyFanSubscriptionList(userId: string): Promise<{
        subscriptions: ({
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
        })[];
    }>;
    fanSubscriptionUserList(userId: string): Promise<{
        subscriptions: ({
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
        })[];
    }>;
    userTransactionHistory(userId: string, transactionType: string): Promise<{
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
        }[] | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: string;
            withdrawAmount: number | null;
            txhash: string | null;
            failureReason: string | null;
            processingAt: Date | null;
        }[] | {
            id: string;
            createdAt: Date;
            userId: string;
            status: string;
            tokenAddress: string;
            vendorId: string;
            amountTokens: string;
            sellAmount: number;
            actualReceivedAmount: number | null;
            adminFeeAmount: number | null;
            transactionHash: string;
        }[] | {
            id: string;
            createdAt: Date;
            userId: string;
            currency: string;
            amount: number;
            status: string;
            stripeInvoiceId: string | null;
            stripePaymentIntentId: string | null;
            vendorId: string | null;
            platformFee: number;
            vendorFee: number;
            restAmount: number;
            tokensReceived: number;
            stripeCheckoutSessionId: string | null;
            purchaseTokenPrice: number | null;
            action: string;
            completedAt: Date | null;
        }[] | ({
            typeTransaction: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: string;
            withdrawAmount: number | null;
            txhash: string | null;
            failureReason: string | null;
            processingAt: Date | null;
        } | {
            typeTransaction: string;
            id: string;
            createdAt: Date;
            userId: string;
            status: string;
            tokenAddress: string;
            vendorId: string;
            amountTokens: string;
            sellAmount: number;
            actualReceivedAmount: number | null;
            adminFeeAmount: number | null;
            transactionHash: string;
        } | {
            typeTransaction: string;
            id: string;
            createdAt: Date;
            userId: string;
            currency: string;
            amount: number;
            status: string;
            stripeInvoiceId: string | null;
            stripePaymentIntentId: string | null;
            vendorId: string | null;
            platformFee: number;
            vendorFee: number;
            restAmount: number;
            tokensReceived: number;
            stripeCheckoutSessionId: string | null;
            purchaseTokenPrice: number | null;
            action: string;
            completedAt: Date | null;
        } | {
            typeTransaction: string;
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
        })[];
    }>;
}
