import { PrismaService } from '../prisma/prisma.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto } from './dto/purchase-tokens.dto';
export declare class TokenPurchaseService {
    private readonly prisma;
    private readonly logger;
    private stripe;
    private readonly PLATFORM_FEE_PERCENT;
    private readonly VENDOR_FEE_PERCENT;
    private readonly TOKEN_RATE;
    constructor(prisma: PrismaService);
    private calculateFees;
    createTokenPurchase(userId: string, dto: PurchaseTokensDto): Promise<TokenPurchaseResponseDto>;
    handlePaymentSuccess(paymentIntentId: string): Promise<void>;
    handlePaymentFailed(paymentIntentId: string): Promise<void>;
    getUserTokenBalance(userId: string): Promise<number>;
    getUserTokenPurchases(userId: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        amount: number;
        platformFee: number;
        vendorFee: number;
        restAmount: number;
        tokensReceived: number;
        completedAt: Date | null;
    }[]>;
}
