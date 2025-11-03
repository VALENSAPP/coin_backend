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
    async getTotaltoken(req) {
        const userId = req.user.userId;
        return this.tokenPurchaseService.getTotalTokenData(userId);
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
    async sellToken(dto, req) {
        const sellerUserId = req.user.userId;
        return this.tokenPurchaseService.sellToken(sellerUserId, dto);
    }
    async getTokenHistory(req, query) {
        const userId = req.user.userId;
        return this.tokenPurchaseService.getUserTokenHistory(userId, query.tokenAddress, query.period);
    }
    async getVendorTokenAmount(req, dto) {
        const userId = req.user.userId;
        const vendorTokenAmount = await this.tokenPurchaseService.getVendorTokenAmount(userId, dto.vendorId);
        return { vendorTokenAmount };
    }
    async getTopCreators() {
        return this.tokenPurchaseService.getTopCreators();
    }
};
exports.TokenPurchaseController = TokenPurchaseController;
__decorate([
    (0, common_1.Get)('getTotaltoken'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get total token amount and price for authenticated user',
        description: 'Returns token price from contract, total tokens received from purchases, and total token amount (price * amount)'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Total token data retrieved successfully ',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    tokenAddress: { type: 'string', example: '0x123...' },
                    tokenAmount: { type: 'number', example: 1500 },
                    tokenPrice: { type: 'number', example: 0.001 },
                    totalTokenAmount: { type: 'number', example: 1.5 },
                    vendorName: { type: 'string', example: 'john_doe' },
                    vendorId: { type: 'string', example: 'user123' }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid JWT token'
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "getTotaltoken", null);
__decorate([
    (0, common_1.Post)('purchase'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Purchase tokens with USD payment',
        description: 'Creates a Stripe checkout session for token purchase. Rate: 1 USD = 100 tokens. All fee parameters (platformFee, vendorFee, restAmount, tokensReceived) are provided by the frontend. Returns session URL for payment redirect.'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Checkout session created successfully',
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
__decorate([
    (0, common_1.Post)('sell-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Sell tokens using blockchain smart contract with permit',
        description: 'Calls the sellWithPermit method on the smart contract to sell tokens. Permit signature is generated server-side using user\'s wallet. Requires tokenAddress and amountTokens.'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Token sale successful',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                transactionHash: { type: 'string', example: '0x123...' },
                tokenAddress: { type: 'string', example: '0x456...' },
                sellerAddress: { type: 'string', example: '0x789...' },
                amountSold: { type: 'number', example: 100.00 },
                remainingTokens: { type: 'number', example: 0.00 },
                blockNumber: { type: 'number', example: 123456 }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid request or insufficient token balance'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid JWT token'
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_tokens_dto_1.SellTokenDto, Object]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "sellToken", null);
__decorate([
    (0, common_1.Get)('token-history'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get user token transaction history',
        description: 'Returns combined history of token purchases and sales with running balance. Optionally filter by token address and/or time period (week/month/year).'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Token history retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                tokenAddress: { type: 'string', nullable: true, example: '0x123...' },
                period: { type: 'string', nullable: true, example: 'week' },
                totalTransactions: { type: 'number', example: 5 },
                currentBalance: { type: 'number', example: 100.50 },
                history: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            type: { type: 'string', enum: ['purchase', 'sale'] },
                            tokenAddress: { type: 'string' },
                            tokenName: { type: 'string' },
                            vendorId: { type: 'string' },
                            amount: { type: 'number', description: 'Positive for purchases, negative for sales' },
                            date: { type: 'string', format: 'date-time' },
                            transactionHash: { type: 'string', nullable: true },
                            balanceAfter: { type: 'number', description: 'Running balance after this transaction' }
                        }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid token address or period'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid JWT token'
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, purchase_tokens_dto_1.GetTokenHistoryDto]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "getTokenHistory", null);
__decorate([
    (0, common_1.Get)('vendor-token-amount'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get total tokens purchased by authenticated user from a specific vendor',
        description: 'Returns the total amount of tokens the authenticated user has purchased from the specified vendor'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Vendor token amount retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                vendorTokenAmount: { type: 'number', example: 1500.50 }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid vendor ID or user not found'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid JWT token'
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, purchase_tokens_dto_1.GetVendorTokenAmountDto]),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "getVendorTokenAmount", null);
__decorate([
    (0, common_1.Get)('top-creators'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get top creators based on latest token purchases',
        description: 'Returns the latest token purchase details for each vendor with their username'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Top creators retrieved successfully',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    username: { type: 'string', example: 'john_doe' },
                    vendorId: { type: 'string', example: 'user123' },
                    purchaseTokenPrice: { type: 'number', example: 0.001 }
                }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TokenPurchaseController.prototype, "getTopCreators", null);
exports.TokenPurchaseController = TokenPurchaseController = __decorate([
    (0, swagger_1.ApiTags)('token-purchase'),
    (0, common_1.Controller)('token-purchase'),
    __metadata("design:paramtypes", [token_purchase_service_1.TokenPurchaseService,
        token_service_1.TokenService])
], TokenPurchaseController);
//# sourceMappingURL=token-purchase.controller.js.map