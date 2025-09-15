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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenPurchaseController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const token_purchase_service_1 = require("./token-purchase.service");
const purchase_tokens_dto_1 = require("./dto/purchase-tokens.dto");
const token_service_1 = require("../token/token.service");
const passport_1 = require("@nestjs/passport");
let TokenPurchaseController = class TokenPurchaseController {
    tokenPurchaseService;
    tokenService;
    constructor(tokenPurchaseService, tokenService) {
        this.tokenPurchaseService = tokenPurchaseService;
        this.tokenService = tokenService;
    }
    async purchaseTokens(dto, req) {
        const userId = req.user.userId;
        return this.tokenPurchaseService.createTokenPurchase(userId, dto);
    }
    async getTokenBalance(req) {
        const userId = req.user.userId;
        const balance = await this.tokenPurchaseService.getUserTokenBalance(userId);
        return { balance };
    }
    async getPurchaseHistory(req) {
        const userId = req.user.userId;
        const purchases = await this.tokenPurchaseService.getUserTokenPurchases(userId);
        return { purchases };
    }
    async buyToken(dto, req) {
        const buyerUserId = req.user.userId;
        return this.tokenPurchaseService.buyToken(buyerUserId, dto);
    }
    async getTokenPrice(dto) {
        return this.tokenService.getPricePerTokenUsd(dto.tokenAddress);
    }
};
exports.TokenPurchaseController = TokenPurchaseController;
__decorate([
    (0, common_1.Post)('purchase'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Purchase tokens with USD payment',
        description: 'Creates a Stripe payment intent for token purchase. Rate: 1 USD = 100 tokens. All fee parameters (platformFee, vendorFee, restAmount, tokensReceived) are provided by the frontend.'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Payment intent created successfully',
        type: purchase_tokens_dto_1.TokenPurchaseResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid request or user not found'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid JWT token'
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_tokens_dto_1.PurchaseTokensDto, Object]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "purchaseTokens", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get user token balance',
        description: 'Returns the current token balance for the authenticated user'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Token balance retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                balance: { type: 'number', example: 1500.50 }
            }
        }
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "getTokenBalance", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get token purchase history',
        description: 'Returns the purchase history for the authenticated user'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Purchase history retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                purchases: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            amount: { type: 'number' },
                            platformFee: { type: 'number' },
                            vendorFee: { type: 'number' },
                            restAmount: { type: 'number' },
                            tokensReceived: { type: 'number' },
                            status: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                            completedAt: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "getPurchaseHistory", null);
__decorate([
    (0, common_1.Post)('buy-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Buy tokens using blockchain smart contract',
        description: 'Calls the buyFor method on the smart contract to purchase tokens. Requires userId (whose token to buy) and userPaid amount.'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Token purchase successful',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                transactionHash: { type: 'string', example: '0x123...' },
                tokenAddress: { type: 'string', example: '0x456...' },
                buyerAddress: { type: 'string', example: '0x789...' },
                usdPaid: { type: 'number', example: 10.00 },
                blockNumber: { type: 'number', example: 123456 }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid request or user/token not found'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid JWT token'
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_tokens_dto_1.BuyTokenDto, Object]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "buyToken", null);
__decorate([
    (0, common_1.Post)('get-token-price'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get token price in USD',
        description: 'Calls the smart contract to get the current price per token in USD for a given token address'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Token price retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                tokenAddress: { type: 'string', example: '0x123...' },
                priceInUsd: { type: 'number', example: 0.0001 },
                priceInWei: { type: 'string', example: '100000000000000' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid token address or contract error'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid JWT token'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_tokens_dto_1.GetTokenPriceDto]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "getTokenPrice", null);
exports.TokenPurchaseController = TokenPurchaseController = __decorate([
    (0, swagger_1.ApiTags)('token-purchase'),
    (0, common_1.Controller)('token-purchase'),
    __metadata("design:paramtypes", [token_purchase_service_1.TokenPurchaseService,
        token_service_1.TokenService])
], TokenPurchaseController);
//# sourceMappingURL=token-purchase.controller.js.map