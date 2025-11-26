import { PrismaService } from '../prisma/prisma.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto, SellTokenDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import Stripe from 'stripe';
export declare class TokenPurchaseService {
    private readonly prisma;
    private readonly tokenService;
    private readonly userService;
    private readonly logger;
    private stripe;
    private readonly TOKEN_RATE;
    constructor(prisma: PrismaService, tokenService: TokenService, userService: UserService);
    private validateFees;
    getTotalTokenData(userId: string): Promise<{
        tokenAddress: string;
        tokenAmount: number;
        tokenPrice: number;
        totalTokenAmount: number;
        vendorName: string;
        vendorId: string;
    }[]>;
    createTokenPurchase(userId: string, dto: PurchaseTokensDto): Promise<TokenPurchaseResponseDto>;
    handlePaymentSuccess(paymentIntentId: string): Promise<void>;
    handleCheckoutSessionCompleted(sessionId: string): Promise<void>;
    handleCheckoutSessionExpired(sessionId: string): Promise<void>;
    handlePaymentFailed(paymentIntentId: string): Promise<void>;
    getUserTokenBalance(userId: string): Promise<number>;
    getVendorTokenAmount(userId: string, vendorId: string): Promise<number>;
    getUserTokenPurchases(userId: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        completedAt: Date | null;
        amount: number;
        platformFee: number;
        vendorFee: number;
        restAmount: number;
        tokensReceived: number;
    }[]>;
    getUserTokenHistory(userId: string, tokenAddress?: string, period?: 'week' | 'month' | 'year'): Promise<{
        tokenAddress: string | null;
        period: "week" | "month" | "year" | null;
        totalTransactions: number;
        currentBalance: number;
        history: any[];
    }>;
    buyToken(buyerUserId: string, dto: BuyTokenDto): Promise<{
        success: boolean;
        transactionHash: any;
        tokenAddress: string;
        buyerAddress: string;
        tokenAmount: number;
        blockNumber: any;
    }>;
    getTopCreators(): Promise<{
        username: string;
        vendorId: string;
        followerCount: number;
        currentTokenStatus: string;
    }[]>;
    sellToken(sellerUserId: string, dto: SellTokenDto): Promise<{
        success: boolean;
        transactionHash: any;
        tokenAddress: string;
        sellerAddress: string;
        amountSold: string;
        remainingTokens: number;
        blockNumber: any;
    }>;
    handleDonationPayment(session: Stripe.Checkout.Session): Promise<void>;
}
