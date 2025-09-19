import { TokenPurchaseService } from './token-purchase.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto, GetTokenPriceDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
import { Request } from 'express';
export declare class TokenPurchaseController {
    private readonly tokenPurchaseService;
    private readonly tokenService;
    constructor(tokenPurchaseService: TokenPurchaseService, tokenService: TokenService);
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
            completedAt: Date | null;
            platformFee: number;
            vendorFee: number;
            restAmount: number;
            tokensReceived: number;
        }[];
    }>;
    buyToken(dto: BuyTokenDto, req: Request): Promise<{
        success: boolean;
        transactionHash: any;
        tokenAddress: string;
        buyerAddress: string;
        usdPaid: number;
        blockNumber: any;
    }>;
    getTokenPrice(dto: GetTokenPriceDto): Promise<{
        tokenAddress: string;
        priceInUsd: number;
        priceInWei: any;
    }>;
}
