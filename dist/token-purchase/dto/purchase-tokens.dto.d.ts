export declare class PurchaseTokensDto {
    amount: number;
    platformFee: number;
    vendorFee: number;
    restAmount: number;
    tokensReceived: number;
    vendorId?: string;
}
export declare class BuyTokenDto {
    userId: string;
    userPaid: number;
}
export declare class GetTokenPriceDto {
    tokenAddress: string;
}
export declare class SellTokenDto {
    tokenAddress: string;
    amountTokens: string;
}
export declare class TokenPurchaseResponseDto {
    id: string;
    amount: number;
    platformFee: number;
    vendorFee: number;
    restAmount: number;
    tokensReceived: number;
    status: string;
    sessionUrl?: string;
}
