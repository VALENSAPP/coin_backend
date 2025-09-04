import { TokenPurchaseService } from './token-purchase.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto } from './dto/purchase-tokens.dto';
import { Request } from 'express';
export declare class TokenPurchaseController {
    private readonly tokenPurchaseService;
    constructor(tokenPurchaseService: TokenPurchaseService);
    purchaseTokens(dto: PurchaseTokensDto, req: Request): Promise<TokenPurchaseResponseDto>;
    getTokenBalance(req: Request): Promise<{
        balance: number;
    }>;
    getPurchaseHistory(req: Request): Promise<{
        purchases: {
            id: string;
            createdAt: Date;
            status: string;
            amount: number;
            platformFee: number;
            vendorFee: number;
            restAmount: number;
            tokensReceived: number;
            completedAt: Date | null;
        }[];
    }>;
}
