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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
        })[];
    }>;
    fanSubscriptionUserList(userId: string): Promise<{
        subscriptions: ({
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
        })[];
    }>;
    userTransactionHistory(userId: string, transactionType: string): Promise<{
        transactions: {
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
            action: string;
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
            action: string;
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
        })[];
    }>;
}
