"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostDonationTotalResponseDto = exports.GetPostDonationTotalDto = exports.GetTokenHistoryDto = exports.TokenPurchaseResponseDto = exports.GetVendorTokenAmountDto = exports.SellTokenDto = exports.GetTokenPriceDto = exports.BuyTokenDto = exports.PurchaseTokensDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class PurchaseTokensDto {
    type;
    amount;
    platformFee;
    vendorFee;
    restAmount;
    tokensReceived;
    purchaseTokenPrice;
    vendorId;
    postId;
}
exports.PurchaseTokensDto = PurchaseTokensDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type of purchase',
        example: 'token_purchase',
        enum: ['token_purchase', 'donation']
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['token_purchase', 'donation']),
    __metadata("design:type", String)
], PurchaseTokensDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in USD to spend on tokens or donate',
        example: 10.00,
        minimum: 0.01
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], PurchaseTokensDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Platform fee provided by frontend (required for token_purchase)',
        example: 0.02,
        minimum: 0,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseTokensDto.prototype, "platformFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor fee provided by frontend (required for token_purchase)',
        example: 0.05,
        minimum: 0,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseTokensDto.prototype, "vendorFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount after deducting fees provided by frontend (required for token_purchase)',
        example: 9.93,
        minimum: 0,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseTokensDto.prototype, "restAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tokens to be received provided by frontend (required for token_purchase)',
        example: 993,
        minimum: 0,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseTokensDto.prototype, "tokensReceived", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token price at the time of purchase',
        example: 0.01,
        minimum: 0
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseTokensDto.prototype, "purchaseTokenPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor user ID (whose tokens are being purchased). Optional - if not provided, platform tokens.',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PurchaseTokensDto.prototype, "vendorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Post ID for which the donation is made (required for donations)',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PurchaseTokensDto.prototype, "postId", void 0);
class BuyTokenDto {
    userId;
    userPaid;
}
exports.BuyTokenDto = BuyTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID whose token is being purchased',
        example: '123e4567-e89b-12d3-a456-426614174000'
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BuyTokenDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount of tokens to purchase (in USD)',
        example: 10.00,
        minimum: 0.01
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], BuyTokenDto.prototype, "userPaid", void 0);
class GetTokenPriceDto {
    tokenAddress;
}
exports.GetTokenPriceDto = GetTokenPriceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token contract address to get price for',
        example: '0x1234567890123456789012345678901234567890'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GetTokenPriceDto.prototype, "tokenAddress", void 0);
class SellTokenDto {
    tokenAddress;
    amountTokens;
}
exports.SellTokenDto = SellTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token contract address to sell',
        example: '0x1234567890123456789012345678901234567890'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SellTokenDto.prototype, "tokenAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount of tokens to sell (in wei, e.g., 100 tokens = 100000000000000000000)',
        example: '100000000000000000000'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SellTokenDto.prototype, "amountTokens", void 0);
class GetVendorTokenAmountDto {
    vendorId;
}
exports.GetVendorTokenAmountDto = GetVendorTokenAmountDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor user ID whose tokens were purchased by the authenticated user',
        example: '123e4567-e89b-12d3-a456-426614174000'
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GetVendorTokenAmountDto.prototype, "vendorId", void 0);
class TokenPurchaseResponseDto {
    id;
    amount;
    platformFee;
    vendorFee;
    restAmount;
    tokensReceived;
    purchaseTokenPrice;
    status;
    sessionUrl;
}
exports.TokenPurchaseResponseDto = TokenPurchaseResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Purchase ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    }),
    __metadata("design:type", String)
], TokenPurchaseResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Original payment amount',
        example: 10.00
    }),
    __metadata("design:type", Number)
], TokenPurchaseResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Platform fee (0.2%)',
        example: 0.02
    }),
    __metadata("design:type", Number)
], TokenPurchaseResponseDto.prototype, "platformFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor fee (0.5%)',
        example: 0.05
    }),
    __metadata("design:type", Number)
], TokenPurchaseResponseDto.prototype, "vendorFee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount after fees',
        example: 9.33
    }),
    __metadata("design:type", Number)
], TokenPurchaseResponseDto.prototype, "restAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tokens to be received (restAmount * 100)',
        example: 933
    }),
    __metadata("design:type", Number)
], TokenPurchaseResponseDto.prototype, "tokensReceived", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token price at the time of purchase',
        example: 0.01
    }),
    __metadata("design:type", Number)
], TokenPurchaseResponseDto.prototype, "purchaseTokenPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment status',
        example: 'pending'
    }),
    __metadata("design:type", String)
], TokenPurchaseResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Stripe checkout session URL for payment',
        example: 'https://checkout.stripe.com/pay/cs_test_...'
    }),
    __metadata("design:type", String)
], TokenPurchaseResponseDto.prototype, "sessionUrl", void 0);
class GetTokenHistoryDto {
    tokenAddress;
    period;
}
exports.GetTokenHistoryDto = GetTokenHistoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token contract address to filter history by. Optional.',
        example: '0x1234567890123456789012345678901234567890',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetTokenHistoryDto.prototype, "tokenAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Time period to filter history: week (last 7 days), month (last 30 days), year (last 365 days). Optional - if not provided, returns all history.',
        example: 'week',
        enum: ['week', 'month', 'year'],
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['week', 'month', 'year']),
    __metadata("design:type", String)
], GetTokenHistoryDto.prototype, "period", void 0);
class GetPostDonationTotalDto {
    postId;
}
exports.GetPostDonationTotalDto = GetPostDonationTotalDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Post ID to get total donation amount for',
        example: '123e4567-e89b-12d3-a456-426614174000'
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GetPostDonationTotalDto.prototype, "postId", void 0);
class PostDonationTotalResponseDto {
    totalDonation;
}
exports.PostDonationTotalResponseDto = PostDonationTotalResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total donation amount for the post',
        example: 150.50
    }),
    __metadata("design:type", Number)
], PostDonationTotalResponseDto.prototype, "totalDonation", void 0);
//# sourceMappingURL=purchase-tokens.dto.js.map