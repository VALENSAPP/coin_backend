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
var TokenPurchaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenPurchaseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const token_service_1 = require("../token/token.service");
const user_service_1 = require("../user/user.service");
const stripe_1 = require("stripe");
const ethers_1 = require("ethers");
let TokenPurchaseService = TokenPurchaseService_1 = class TokenPurchaseService {
    prisma;
    tokenService;
    userService;
    logger = new common_1.Logger(TokenPurchaseService_1.name);
    stripe;
    TOKEN_RATE = 100;
    constructor(prisma, tokenService, userService) {
        this.prisma = prisma;
        this.tokenService = tokenService;
        this.userService = userService;
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20',
        });
    }
    validateFees(dto) {
        const expectedRestAmount = dto.amount - (dto.platformFee + dto.vendorFee);
        const expectedTokensReceived = expectedRestAmount * this.TOKEN_RATE;
        if (Math.abs(dto.restAmount - expectedRestAmount) > 0.01) {
            throw new common_1.BadRequestException('Invalid restAmount: does not match amount - (platformFee + vendorFee)');
        }
        if (Math.abs(dto.tokensReceived - expectedTokensReceived) > 0.01) {
            throw new common_1.BadRequestException('Invalid tokensReceived: does not match restAmount * token rate');
        }
    }
    async createTokenPurchase(userId, dto) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true },
            });
            if (!user) {
                throw new common_1.BadRequestException('User not found');
            }
            if (dto.vendorId) {
                const vendor = await this.prisma.user.findUnique({
                    where: { id: dto.vendorId },
                    select: { id: true },
                });
                if (!vendor) {
                    throw new common_1.BadRequestException('Vendor not found');
                }
            }
            this.logger.log(`Creating token purchase for user ${userId}: $${dto.amount} -> ${dto.tokensReceived} tokens`);
            const successUrl = process.env.STRIPE_SUCCESS_URL;
            const cancelUrl = process.env.STRIPE_CANCEL_URL;
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Token Purchase',
                                description: `Purchase ${dto.tokensReceived} tokens`,
                            },
                            unit_amount: Math.round(dto.amount * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    userId,
                    vendorId: dto.vendorId || '',
                    type: 'token_purchase',
                },
                customer_email: user.email || undefined,
            });
            const tokenPurchase = await this.prisma.tokenPurchase.create({
                data: {
                    userId,
                    vendorId: dto.vendorId,
                    amount: dto.amount,
                    platformFee: dto.platformFee,
                    vendorFee: dto.vendorFee,
                    restAmount: dto.restAmount,
                    tokensReceived: dto.tokensReceived,
                    stripeCheckoutSessionId: session.id,
                    status: 'pending',
                },
            });
            return {
                id: tokenPurchase.id,
                amount: dto.amount,
                platformFee: dto.platformFee,
                vendorFee: dto.vendorFee,
                restAmount: dto.restAmount,
                tokensReceived: dto.tokensReceived,
                status: tokenPurchase.status,
                sessionUrl: session.url,
            };
        }
        catch (error) {
            this.logger.error('Error creating token purchase:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to create token purchase');
        }
    }
    async handlePaymentSuccess(paymentIntentId) {
        try {
            const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
                where: { stripePaymentIntentId: paymentIntentId },
            });
            if (!tokenPurchase) {
                this.logger.warn(`Token purchase not found for payment intent: ${paymentIntentId}`);
                return;
            }
            if (tokenPurchase.status === 'completed') {
                this.logger.log(`Token purchase already completed: ${tokenPurchase.id}`);
                return;
            }
            await this.prisma.tokenPurchase.update({
                where: { id: tokenPurchase.id },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            });
            this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens purchased for user ${tokenPurchase.userId}`);
        }
        catch (error) {
            this.logger.error('Error handling payment success:', error);
            throw error;
        }
    }
    async handleCheckoutSessionCompleted(sessionId) {
        try {
            const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
                where: { stripeCheckoutSessionId: sessionId },
            });
            if (!tokenPurchase) {
                this.logger.warn(`Token purchase not found for checkout session: ${sessionId}`);
                return;
            }
            this.logger.log(`Token purchase found: ${JSON.stringify({
                id: tokenPurchase.id,
                userId: tokenPurchase.userId,
                vendorId: tokenPurchase.vendorId,
                amount: tokenPurchase.amount,
                status: tokenPurchase.status
            })}`);
            if (tokenPurchase.status === 'completed') {
                this.logger.log(`Token purchase already completed: ${tokenPurchase.id}`);
                return;
            }
            await this.prisma.tokenPurchase.update({
                where: { id: tokenPurchase.id },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            });
            const user = await this.prisma.user.findUnique({
                where: { id: tokenPurchase.userId },
                select: { id: true, walletAddress: true },
            });
            if (!user || !user.walletAddress) {
                this.logger.error(`User ${tokenPurchase.userId} not found or no wallet address`);
                return;
            }
            let coinAddress = null;
            if (tokenPurchase.vendorId) {
                const vendorToken = await this.prisma.userToken.findFirst({
                    where: { userId: tokenPurchase.vendorId },
                    select: { tokenAddress: true },
                });
                if (vendorToken && vendorToken.tokenAddress) {
                    coinAddress = vendorToken.tokenAddress;
                }
            }
            if (!coinAddress) {
                coinAddress = process.env.DEFAULT_COIN_ADDRESS;
            }
            if (!coinAddress) {
                this.logger.error('No coin address available for purchase');
                return;
            }
            const usdPaid = ethers_1.ethers.parseEther(tokenPurchase.amount.toString());
            console.log("?????????????????????????????????????????????????????????????????", usdPaid);
            const contract = this.tokenService.getContract();
            if (!contract) {
                this.logger.error('Smart contract not initialized');
                return;
            }
            try {
                const tx = await contract.buyFor(coinAddress, user.walletAddress, usdPaid);
                this.logger.log(`BuyFor transaction sent: ${tx.hash} for user ${tokenPurchase.userId}`);
                const receipt = await tx.wait();
                this.logger.log(`BuyFor transaction confirmed in block: ${receipt.blockNumber}`);
                this.logger.log(`Checking follow logic - vendorId: ${tokenPurchase.vendorId}, userId: ${tokenPurchase.userId}`);
                if (tokenPurchase.vendorId && tokenPurchase.vendorId.trim() !== '') {
                    this.logger.log(`Attempting to follow token owner ${tokenPurchase.vendorId} by user ${tokenPurchase.userId}`);
                    try {
                        await this.userService.followPerson(tokenPurchase.userId, tokenPurchase.vendorId);
                        this.logger.log(`SUCCESS: User ${tokenPurchase.userId} followed token owner ${tokenPurchase.vendorId}`);
                    }
                    catch (followError) {
                        if (followError.message && followError.message.includes('Already following')) {
                            this.logger.log(`INFO: User ${tokenPurchase.userId} already follows token owner ${tokenPurchase.vendorId}`);
                        }
                        else {
                            this.logger.error(`FAILED: Follow attempt failed: ${followError.message}`, followError.stack);
                        }
                    }
                }
                else {
                    this.logger.log(`SKIP: No valid vendorId found (null or empty), skipping follow`);
                }
            }
            catch (blockchainError) {
                this.logger.error('Error calling buyFor on blockchain:', blockchainError);
            }
            this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens purchased for user ${tokenPurchase.userId}`);
        }
        catch (error) {
            this.logger.error('Error handling checkout session success:', error);
            throw error;
        }
    }
    async handleCheckoutSessionExpired(sessionId) {
        try {
            const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
                where: { stripeCheckoutSessionId: sessionId },
            });
            if (!tokenPurchase) {
                this.logger.warn(`Token purchase not found for checkout session: ${sessionId}`);
                return;
            }
            await this.prisma.tokenPurchase.update({
                where: { id: tokenPurchase.id },
                data: {
                    status: 'expired',
                },
            });
            this.logger.log(`Token purchase expired: ${tokenPurchase.id}`);
        }
        catch (error) {
            this.logger.error('Error handling checkout session expiration:', error);
            throw error;
        }
    }
    async handlePaymentFailed(paymentIntentId) {
        try {
            const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
                where: { stripePaymentIntentId: paymentIntentId },
            });
            if (!tokenPurchase) {
                this.logger.warn(`Token purchase not found for payment intent: ${paymentIntentId}`);
                return;
            }
            await this.prisma.tokenPurchase.update({
                where: { id: tokenPurchase.id },
                data: {
                    status: 'failed',
                },
            });
            this.logger.log(`Token purchase failed: ${tokenPurchase.id}`);
        }
        catch (error) {
            this.logger.error('Error handling payment failure:', error);
            throw error;
        }
    }
    async getUserTokenBalance(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { tokenBalance: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        return user.tokenBalance;
    }
    async getUserTokenPurchases(userId) {
        return this.prisma.tokenPurchase.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                amount: true,
                platformFee: true,
                vendorFee: true,
                restAmount: true,
                tokensReceived: true,
                status: true,
                createdAt: true,
                completedAt: true,
            },
        });
    }
    async buyToken(buyerUserId, dto) {
        try {
            const buyer = await this.prisma.user.findUnique({
                where: { id: buyerUserId },
                select: { id: true, walletAddress: true },
            });
            if (!buyer) {
                throw new common_1.BadRequestException('Buyer not found');
            }
            if (!buyer.walletAddress) {
                throw new common_1.BadRequestException('Buyer wallet address not found');
            }
            const userToken = await this.prisma.userToken.findFirst({
                where: { userId: dto.userId },
                select: { tokenAddress: true, tokenName: true },
            });
            if (!userToken || !userToken.tokenAddress) {
                throw new common_1.BadRequestException('Token not found for this user');
            }
            this.logger.log(`Buying token for user ${dto.userId}: ${userToken.tokenName} (${userToken.tokenAddress})`);
            const usdPaid = ethers_1.ethers.parseEther(dto.userPaid.toString());
            const contract = this.tokenService.getContract();
            if (!contract) {
                throw new common_1.BadRequestException('Smart contract not initialized');
            }
            const tx = await contract.buyFor(userToken.tokenAddress, buyer.walletAddress, usdPaid);
            this.logger.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
            return {
                success: true,
                transactionHash: tx.hash,
                tokenAddress: userToken.tokenAddress,
                buyerAddress: buyer.walletAddress,
                usdPaid: dto.userPaid,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            this.logger.error('Error buying token:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to buy token: ${error.message}`);
        }
    }
};
exports.TokenPurchaseService = TokenPurchaseService;
exports.TokenPurchaseService = TokenPurchaseService = TokenPurchaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        token_service_1.TokenService,
        user_service_1.UserService])
], TokenPurchaseService);
//# sourceMappingURL=token-purchase.service.js.map