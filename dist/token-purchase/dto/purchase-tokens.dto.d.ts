export declare class PurchaseTokensDto {
    amount: number;
    vendorId?: string;
}
export declare class TokenPurchaseResponseDto {
    id: string;
    amount: number;
    platformFee: number;
    vendorFee: number;
    restAmount: number;
    tokensReceived: number;
    status: string;
    stripePaymentIntentId: string;
}
