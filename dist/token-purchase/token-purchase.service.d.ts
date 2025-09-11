import { PrismaService } from '../prisma/prisma.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
export declare class TokenPurchaseService {
    private readonly prisma;
    private readonly tokenService;
    private readonly logger;
    private stripe;
    private readonly PLATFORM_FEE_PERCENT;
    private readonly VENDOR_FEE_PERCENT;
    private readonly TOKEN_RATE;
    constructor(prisma: PrismaService, tokenService: TokenService);
    private calculateFees;
    createTokenPurchase(userId: string, dto: PurchaseTokensDto): Promise<TokenPurchaseResponseDto>;
    handlePaymentSuccess(paymentIntentId: string): Promise<void>;
    handlePaymentFailed(paymentIntentId: string): Promise<void>;
    getUserTokenBalance(userId: string): Promise<number>;
    getUserTokenPurchases(userId: string): Promise<{
        id: string;
        createdAt: Date;
        amount: number;
        platformFee: number;
        vendorFee: number;
        restAmount: number;
        tokensReceived: number;
        status: string;
        completedAt: Date | null;
    }[]>;
    buyToken(buyerUserId: string, dto: BuyTokenDto): Promise<{
        success: boolean;
        transactionHash: any;
        tokenAddress: string;
        buyerAddress: string;
        usdPaid: number;
        blockNumber: any;
    }>;
}
