export declare class PurchaseTokensDto {
    type: string;
    amount: number;
    platformFee?: number;
    vendorFee?: number;
    restAmount?: number;
    tokensReceived?: number;
    purchaseTokenPrice: number;
    vendorId?: string;
    postId?: string;
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
export declare class GetVendorTokenAmountDto {
    vendorId: string;
}
export declare class TokenPurchaseResponseDto {
    id: string;
    amount: number;
    platformFee: number;
    vendorFee: number;
    restAmount: number;
    tokensReceived: number;
    purchaseTokenPrice: number;
    status: string;
    sessionUrl?: string;
}
export declare class GetTokenHistoryDto {
    tokenAddress?: string;
    period?: 'week' | 'month' | 'year';
}
export declare class GetPostDonationTotalDto {
    postId: string;
}
export declare class PostDonationTotalResponseDto {
    totalDonation: number;
}
