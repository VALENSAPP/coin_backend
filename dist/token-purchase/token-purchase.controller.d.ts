import { TokenPurchaseService } from './token-purchase.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto, GetTokenPriceDto, SellTokenDto, GetVendorTokenAmountDto, GetTokenHistoryDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
import { Request } from 'express';
export declare class TokenPurchaseController {
    private readonly tokenPurchaseService;
    private readonly tokenService;
    constructor(tokenPurchaseService: TokenPurchaseService, tokenService: TokenService);
    getTotaltoken(req: Request): Promise<{
        tokenAddress: string;
        tokenAmount: number;
        tokenPrice: number;
        totalTokenAmount: number;
        vendorName: string;
        vendorId: string;
    }[]>;
    purchaseTokens(dto: PurchaseTokensDto, req: Request): Promise<TokenPurchaseResponseDto>;
    getTokenBalance(req: Request): Promise<{
        balance: number;
    }>;
    getPurchaseHistory(req: Request): Promise<{
        purchases: {
            status: string;
            id: string;
            createdAt: Date;
            completedAt: Date | null;
            amount: number;
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
    sellToken(dto: SellTokenDto, req: Request): Promise<{
        success: boolean;
        transactionHash: any;
        tokenAddress: string;
        sellerAddress: string;
        amountSold: string;
        remainingTokens: number;
        blockNumber: any;
    }>;
    getTokenHistory(req: Request, query: GetTokenHistoryDto): Promise<{
        tokenAddress: string | null;
        period: "week" | "month" | "year" | null;
        totalTransactions: number;
        currentBalance: number;
        history: any[];
    }>;
    getVendorTokenAmount(req: Request, dto: GetVendorTokenAmountDto): Promise<{
        vendorTokenAmount: number;
    }>;
    getTopCreators(): Promise<{
        username: string;
        vendorId: string;
        followerCount: number;
        currentTokenStatus: string;
    }[]>;
}
