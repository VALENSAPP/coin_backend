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
const passport_1 = require("@nestjs/passport");
let TokenPurchaseController = class TokenPurchaseController {
    tokenPurchaseService;
    constructor(tokenPurchaseService) {
        this.tokenPurchaseService = tokenPurchaseService;
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
};
exports.TokenPurchaseController = TokenPurchaseController;
__decorate([
    (0, common_1.Post)('purchase'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Purchase tokens with USD payment',
        description: 'Creates a Stripe payment intent for token purchase. Rate: 1 USD = 100 tokens. Fees: 0.2% platform + 0.5% vendor = 0.7% total deduction.'
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
exports.TokenPurchaseController = TokenPurchaseController = __decorate([
    (0, swagger_1.ApiTags)('token-purchase'),
    (0, common_1.Controller)('token-purchase'),
    __metadata("design:paramtypes", [token_purchase_service_1.TokenPurchaseService])
], TokenPurchaseController);
//# sourceMappingURL=token-purchase.controller.js.map