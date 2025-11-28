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
const notification_service_1 = require("../notification/notification.service");
const stripe_1 = require("stripe");
const ethers_1 = require("ethers");
const crypto_util_1 = require("../common/crypto.util");
let TokenPurchaseService = TokenPurchaseService_1 = class TokenPurchaseService {
    prisma;
    tokenService;
    userService;
    notificationService;
    logger = new common_1.Logger(TokenPurchaseService_1.name);
    stripe;
    TOKEN_RATE = 100;
    constructor(prisma, tokenService, userService, notificationService) {
        this.prisma = prisma;
        this.tokenService = tokenService;
        this.userService = userService;
        this.notificationService = notificationService;
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20',
        });
    }
    async getTotalTokenData(userId) {
        try {
            const tokenPurchases = await this.prisma.tokenPurchase.findMany({
                where: {
                    userId,
                    status: {
                        in: ['completed', 'complete']
                    },
                    action: 'buy',
                },
                select: {
                    vendorId: true,
                    tokensReceived: true,
                },
            });
            if (!tokenPurchases || tokenPurchases.length === 0) {
                return [];
            }
            const vendorTokenMap = new Map();
            for (const purchase of tokenPurchases) {
                if (purchase.vendorId) {
                    const currentAmount = vendorTokenMap.get(purchase.vendorId) || 0;
                    vendorTokenMap.set(purchase.vendorId, currentAmount + purchase.tokensReceived);
                }
            }
            const result = [];
            for (const [vendorId, tokenAmount] of vendorTokenMap.entries()) {
                const userToken = await this.prisma.userToken.findFirst({
                    where: { userId: vendorId },
                    select: { tokenAddress: true },
                });
                if (!userToken || !userToken.tokenAddress) {
                    this.logger.warn(`Token address not found for vendor ${vendorId}`);
                    continue;
                }
                const vendor = await this.prisma.user.findUnique({
                    where: { id: vendorId },
                    select: { userName: true },
                });
                const vendorName = vendor?.userName || 'Unknown Vendor';
                const tokenAddress = userToken.tokenAddress;
                const priceData = await this.tokenService.getPricePerTokenUsd(tokenAddress);
                const tokenPrice = priceData.priceInUsd;
                const totalTokenAmount = tokenPrice * tokenAmount;
                result.push({
                    tokenAddress,
                    tokenAmount,
                    tokenPrice,
                    totalTokenAmount,
                    vendorName,
                    vendorId,
                });
            }
            return result;
        }
        catch (error) {
            this.logger.error('Error getting total token data:', error);
            throw error;
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
            let productName;
            let productDescription;
            let metadataType;
            if (dto.type === 'token_purchase') {
                if (dto.platformFee === undefined || dto.vendorFee === undefined || dto.restAmount === undefined || dto.tokensReceived === undefined) {
                    throw new common_1.BadRequestException('Fee fields are required for token purchase');
                }
                productName = 'Token Purchase';
                productDescription = `Purchase ${dto.tokensReceived} tokens`;
                metadataType = 'token_purchase';
                this.logger.log(`Creating token purchase for user ${userId}: $${dto.amount} -> ${dto.tokensReceived} tokens`);
            }
            else if (dto.type === 'donation') {
                productName = 'Donation';
                productDescription = `Donate $${dto.amount}`;
                metadataType = 'donation';
                this.logger.log(`Creating donation for user ${userId}: $${dto.amount}`);
            }
            else {
                throw new common_1.BadRequestException('Invalid type');
            }
            const successUrl = process.env.STRIPE_SUCCESS_URL;
            const cancelUrl = process.env.STRIPE_CANCEL_URL;
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: productName,
                                description: productDescription,
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
                    type: metadataType,
                },
                customer_email: user.email || undefined,
            });
            const paymentData = {
                userId,
                amount: Math.round(dto.amount * 100),
                currency: 'usd',
                stripePaymentIntentId: session.id,
                status: 'pending',
                forPayment: dto.type === 'token_purchase' ? 'tokenPurchase' : 'donation',
            };
            await this.prisma.payment.create({
                data: paymentData,
            });
            let record;
            let response;
            if (dto.type === 'token_purchase') {
                const tokenPurchaseData = {
                    userId,
                    vendorId: dto.vendorId,
                    amount: dto.amount,
                    platformFee: dto.platformFee,
                    vendorFee: dto.vendorFee,
                    restAmount: dto.restAmount,
                    tokensReceived: dto.tokensReceived,
                    stripeCheckoutSessionId: session.id,
                    status: 'pending',
                };
                if (dto.purchaseTokenPrice !== undefined) {
                    tokenPurchaseData.purchaseTokenPrice = dto.purchaseTokenPrice;
                }
                record = await this.prisma.tokenPurchase.create({
                    data: tokenPurchaseData,
                });
                response = {
                    id: record.id,
                    amount: dto.amount,
                    platformFee: dto.platformFee,
                    vendorFee: dto.vendorFee,
                    restAmount: dto.restAmount,
                    tokensReceived: dto.tokensReceived,
                    status: record.status,
                    sessionUrl: session.url,
                };
                if (dto.purchaseTokenPrice !== undefined) {
                    response.purchaseTokenPrice = dto.purchaseTokenPrice;
                }
            }
            else if (dto.type === 'donation') {
                const donationData = {
                    userId,
                    vendorId: dto.vendorId,
                    postId: dto.postId,
                    amount: dto.amount,
                    stripeCheckoutSessionId: session.id,
                    status: 'pending',
                };
                if (dto.purchaseTokenPrice !== undefined) {
                    donationData.purchaseTokenPrice = dto.purchaseTokenPrice;
                }
                record = await this.prisma.donationData.create({
                    data: donationData,
                });
                response = {
                    id: record.id,
                    amount: dto.amount,
                    status: record.status,
                    sessionUrl: session.url,
                };
                if (dto.purchaseTokenPrice !== undefined) {
                    response.purchaseTokenPrice = dto.purchaseTokenPrice;
                }
            }
            return response;
        }
        catch (error) {
            this.logger.error('Error creating purchase:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to create purchase');
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
            await this.prisma.payment.updateMany({
                where: {
                    userId: tokenPurchase.userId,
                    stripePaymentIntentId: sessionId,
                    status: 'pending',
                    forPayment: 'tokenPurchase',
                },
                data: {
                    status: 'completed',
                },
            });
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
                this.logger.error('No coin address available for purchase');
                return;
            }
            if (!tokenPurchase.vendorId) {
                this.logger.warn('No vendorId for token purchase, skipping buyToken');
                return;
            }
            const buyResult = await this.buyToken(tokenPurchase.userId, {
                userId: tokenPurchase.vendorId,
                userPaid: tokenPurchase.tokensReceived
            });
            this.logger.log(`BuyToken completed: ${buyResult.transactionHash} for user ${tokenPurchase.userId}`);
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
            this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens purchased for user ${tokenPurchase.userId}`);
            try {
                await this.notificationService.sendNotificationToUser(tokenPurchase.userId, 'Token Purchase Successful', `Congratulations! You have successfully purchased ${tokenPurchase.tokensReceived} tokens.`, { type: 'token_purchase', purchaseId: tokenPurchase.id });
            }
            catch (notificationError) {
                this.logger.error('Failed to send push notification:', notificationError);
            }
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
    async getVendorTokenAmount(userId, vendorId) {
        try {
            const tokenPurchaseSum = await this.prisma.tokenPurchase.aggregate({
                _sum: {
                    tokensReceived: true,
                },
                where: {
                    userId,
                    vendorId,
                    status: {
                        in: ['completed', 'complete']
                    },
                },
            });
            return tokenPurchaseSum._sum.tokensReceived || 0;
        }
        catch (error) {
            this.logger.error('Error getting vendor token amount:', error);
            throw new common_1.BadRequestException('Failed to get vendor token amount');
        }
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
    async getUserTokenHistory(userId, tokenAddress, period) {
        try {
            if (tokenAddress) {
                const tokenExists = await this.prisma.userToken.findFirst({
                    where: { tokenAddress },
                    select: { userId: true },
                });
                if (!tokenExists) {
                    throw new common_1.BadRequestException('Invalid token address: token not found');
                }
            }
            let dateFilter = null;
            if (period) {
                const now = new Date();
                switch (period) {
                    case 'week':
                        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    case 'year':
                        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        break;
                }
            }
            console.log("?????????????????????????????????????????????????????????????????", userId, tokenAddress, period);
            let purchaseWhere = {
                status: {
                    in: ['completed', 'complete']
                },
            };
            if (tokenAddress) {
                const userToken = await this.prisma.userToken.findFirst({
                    where: { tokenAddress },
                    select: { userId: true },
                });
                if (userToken) {
                    purchaseWhere.vendorId = userToken.userId;
                }
            }
            if (dateFilter) {
                purchaseWhere.createdAt = {
                    gte: dateFilter,
                };
            }
            const purchases = await this.prisma.tokenPurchase.findMany({
                where: purchaseWhere,
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    vendorId: true,
                    tokensReceived: true,
                    completedAt: true,
                    createdAt: true,
                },
            });
            const purchaseWithTokenDetails = await Promise.all(purchases.map(async (purchase) => {
                if (!purchase.vendorId) {
                    return {
                        ...purchase,
                        userToken: null,
                    };
                }
                const userToken = await this.prisma.userToken.findFirst({
                    where: { userId: purchase.vendorId },
                    select: {
                        tokenAddress: true,
                        tokenName: true,
                    },
                });
                return {
                    ...purchase,
                    userToken,
                };
            }));
            let saleWhere = {
                status: 'completed',
            };
            if (tokenAddress) {
                saleWhere.tokenAddress = tokenAddress;
            }
            if (dateFilter) {
                saleWhere.createdAt = {
                    gte: dateFilter,
                };
            }
            const sales = await this.prisma.tokenSale.findMany({
                where: saleWhere,
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    tokenAddress: true,
                    vendorId: true,
                    sellAmount: true,
                    transactionHash: true,
                    createdAt: true,
                },
            });
            const salesWithTokenDetails = await Promise.all(sales.map(async (sale) => {
                const userToken = await this.prisma.userToken.findFirst({
                    where: { tokenAddress: sale.tokenAddress },
                    select: {
                        tokenName: true,
                    },
                });
                return {
                    ...sale,
                    userToken,
                };
            }));
            const allTransactions = [];
            purchaseWithTokenDetails.forEach(purchase => {
                const transactionDate = purchase.completedAt || purchase.createdAt;
                if (transactionDate) {
                    allTransactions.push({
                        id: purchase.id,
                        type: 'purchase',
                        tokenAddress: purchase.userToken?.tokenAddress || '',
                        tokenName: purchase.userToken?.tokenName || '',
                        vendorId: purchase.vendorId,
                        amount: purchase.tokensReceived,
                        date: transactionDate,
                        transactionHash: null,
                    });
                }
            });
            salesWithTokenDetails.forEach((sale) => {
                allTransactions.push({
                    id: sale.id,
                    type: 'sale',
                    tokenAddress: sale.tokenAddress,
                    tokenName: sale.userToken?.tokenName || '',
                    vendorId: sale.vendorId,
                    amount: -sale.sellAmount,
                    date: sale.createdAt,
                    transactionHash: sale.transactionHash,
                });
            });
            allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let runningBalance = 0;
            const historyWithBalance = allTransactions.map(transaction => {
                runningBalance += transaction.amount;
                return {
                    ...transaction,
                    balanceAfter: runningBalance,
                };
            });
            return {
                tokenAddress: tokenAddress || null,
                period: period || null,
                totalTransactions: historyWithBalance.length,
                currentBalance: runningBalance,
                history: historyWithBalance.reverse(),
            };
        }
        catch (error) {
            this.logger.error('Error getting token history:', error);
            throw new common_1.BadRequestException('Failed to get token history');
        }
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
            this.logger.log(`dto.userPaid (token amount): ${dto.userPaid}`);
            const tokenAmountInWei = ethers_1.ethers.parseEther(dto.userPaid.toString());
            this.logger.log(`Converted token amount to wei: ${tokenAmountInWei.toString()}`);
            const contract = this.tokenService.getContract();
            if (!contract) {
                throw new common_1.BadRequestException('Smart contract not initialized');
            }
            const tx = await contract.buyFor(userToken.tokenAddress, buyer.walletAddress, tokenAmountInWei);
            this.logger.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
            return {
                success: true,
                transactionHash: tx.hash,
                tokenAddress: userToken.tokenAddress,
                buyerAddress: buyer.walletAddress,
                tokenAmount: dto.userPaid,
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
    async getTopCreators() {
        try {
            const purchases = await this.prisma.tokenPurchase.findMany({
                where: {
                    vendorId: { not: null },
                    purchaseTokenPrice: { not: null }
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    vendorId: true,
                    purchaseTokenPrice: true,
                    createdAt: true
                },
            });
            const latestByVendor = new Map();
            for (const purchase of purchases) {
                if (purchase.vendorId && !latestByVendor.has(purchase.vendorId)) {
                    latestByVendor.set(purchase.vendorId, {
                        purchaseTokenPrice: purchase.purchaseTokenPrice,
                        createdAt: purchase.createdAt
                    });
                }
            }
            const result = [];
            for (const [vendorId, data] of latestByVendor) {
                const user = await this.prisma.user.findUnique({
                    where: { id: vendorId },
                    select: { userName: true, displayName: true, id: true },
                });
                if (user) {
                    const followerCount = await this.prisma.followerAndFollowing.count({
                        where: {
                            followingId: vendorId,
                            status: 'ACCEPTED'
                        }
                    });
                    let currentTokenStatus = 'low';
                    const userToken = await this.prisma.userToken.findFirst({
                        where: { userId: vendorId },
                        select: { tokenAddress: true, initialPrice: true }
                    });
                    if (userToken?.tokenAddress) {
                        try {
                            const currentPriceData = await this.tokenService.getPricePerTokenUsd(userToken.tokenAddress);
                            const currentPrice = currentPriceData.priceInUsd;
                            const initialPrice = parseFloat(userToken.initialPrice || '0');
                            if (initialPrice > 0) {
                                const growthPercentage = ((currentPrice - initialPrice) / initialPrice) * 100;
                                currentTokenStatus = growthPercentage > 0 ? 'up' : 'low';
                            }
                        }
                        catch (error) {
                            this.logger.warn(`Failed to calculate token status for user ${vendorId}:`, error);
                        }
                    }
                    result.push({
                        username: user.userName || user.displayName || 'Unknown',
                        vendorId,
                        followerCount,
                        currentTokenStatus,
                    });
                }
            }
            result.sort((a, b) => b.followerCount - a.followerCount);
            return result;
        }
        catch (error) {
            this.logger.error('Error getting top creators:', error);
            throw new common_1.BadRequestException('Failed to get top creators');
        }
    }
    async sellToken(sellerUserId, dto) {
        try {
            const seller = await this.prisma.user.findUnique({
                where: { id: sellerUserId },
                select: { id: true, walletAddress: true, walletPrivateKey: true },
            });
            if (!seller) {
                throw new common_1.BadRequestException('Seller not found');
            }
            if (!seller.walletAddress) {
                throw new common_1.BadRequestException('Seller wallet address not found');
            }
            if (!seller.walletPrivateKey) {
                throw new common_1.BadRequestException('Seller wallet private key not found');
            }
            const userToken = await this.prisma.userToken.findFirst({
                where: { tokenAddress: dto.tokenAddress },
                select: { userId: true, tokenName: true },
            });
            if (!userToken) {
                throw new common_1.BadRequestException('Token not found');
            }
            const vendorId = userToken.userId;
            this.logger.log(`Selling token for user ${sellerUserId}: ${userToken.tokenName} (${dto.tokenAddress})`);
            const tokenPurchases = await this.prisma.tokenPurchase.findMany({
                where: {
                    userId: sellerUserId,
                    vendorId: vendorId,
                    status: {
                        in: ['completed', 'complete']
                    },
                },
                select: { tokensReceived: true },
            });
            const totalTokensOwned = tokenPurchases.reduce((sum, purchase) => sum + purchase.tokensReceived, 0);
            this.logger.log(`User ${sellerUserId} owns ${totalTokensOwned} tokens of ${dto.tokenAddress}`);
            const checkAmount = Number(dto.amountTokens);
            console.log("pppppppppddddpppppppppppp", checkAmount, totalTokensOwned);
            if (checkAmount > totalTokensOwned) {
                throw new common_1.BadRequestException(`Insufficient token balance. Owned: ${totalTokensOwned}, Trying to sell: ${checkAmount}`);
            }
            if (isNaN(checkAmount) || !isFinite(checkAmount) || checkAmount <= 0 || !Number.isInteger(checkAmount)) {
                throw new common_1.BadRequestException('Invalid amountTokens: must be a positive integer');
            }
            const amountToSell = BigInt(Math.round(Number(dto.amountTokens) * 1e18));
            const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
            const privateKey = (0, crypto_util_1.decryptSecret)(seller.walletPrivateKey, encryptionKey);
            const spender = process.env.BSC_CONTRACT_ADDRESS;
            if (!spender) {
                throw new common_1.BadRequestException('Contract address not configured');
            }
            const provider = new ethers_1.ethers.JsonRpcProvider(process.env.BSC_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545");
            const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
            const tokenAbi = [
                "function name() view returns (string)",
                "function nonces(address) view returns (uint256)",
                "function DOMAIN_SEPARATOR() view returns (bytes32)"
            ];
            const tokenContract = new ethers_1.ethers.Contract(dto.tokenAddress, tokenAbi, provider);
            const name = await tokenContract.name();
            const version = "1";
            const chainId = (await provider.getNetwork()).chainId;
            const nonce = await tokenContract.nonces(wallet.address);
            const domain = {
                name,
                version,
                chainId,
                verifyingContract: dto.tokenAddress,
            };
            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const message = {
                owner: wallet.address,
                spender,
                value: amountToSell,
                nonce,
                deadline,
            };
            this.logger.log(`Generating permit signature for token sale: ${JSON.stringify(message, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);
            const signature = await wallet.signTypedData(domain, types, message);
            const sig = ethers_1.ethers.Signature.from(signature);
            const { v, r, s } = sig;
            const contract = this.tokenService.getContract();
            if (!contract) {
                throw new common_1.BadRequestException('Smart contract not initialized');
            }
            const tx = await contract.sellWithPermit(dto.tokenAddress, seller.walletAddress, amountToSell, deadline, v, r, s);
            this.logger.log(`SellWithPermit transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`SellWithPermit transaction confirmed in block: ${receipt.blockNumber}`);
            const tokenSale = await this.prisma.tokenSale.create({
                data: {
                    userId: sellerUserId,
                    tokenAddress: dto.tokenAddress,
                    vendorId: vendorId,
                    amountTokens: dto.amountTokens,
                    sellAmount: checkAmount,
                    transactionHash: tx.hash,
                    status: 'completed',
                },
            });
            this.logger.log(`Token sale completed for user ${sellerUserId} (database recording temporarily disabled)`);
            const remainingTokens = totalTokensOwned - checkAmount;
            if (remainingTokens <= 0.000001) {
                this.logger.log(`User ${sellerUserId} sold all tokens of ${dto.tokenAddress}, unfollowing vendor ${vendorId}`);
                try {
                    await this.userService.unfollow(sellerUserId, vendorId);
                    this.logger.log(`SUCCESS: User ${sellerUserId} unfollowed vendor ${vendorId}`);
                }
                catch (unfollowError) {
                    this.logger.error(`FAILED: Unfollow attempt failed: ${unfollowError.message}`, unfollowError.stack);
                }
            }
            else {
                this.logger.log(`User ${sellerUserId} still has ${remainingTokens} tokens remaining, keeping follow`);
            }
            return {
                success: true,
                transactionHash: tx.hash,
                tokenAddress: dto.tokenAddress,
                sellerAddress: seller.walletAddress,
                amountSold: dto.amountTokens,
                remainingTokens: remainingTokens,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            this.logger.error('Error selling token:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to sell token: ${error.message}`);
        }
    }
    async handleDonationPayment(session) {
        try {
            const userId = session.metadata?.userId;
            const vendorId = session.metadata?.vendorId;
            if (!userId) {
                this.logger.error('Missing userId in donation session metadata');
                return;
            }
            await this.prisma.payment.updateMany({
                where: {
                    userId,
                    stripePaymentIntentId: session.id,
                    status: 'pending',
                    forPayment: 'donation',
                },
                data: {
                    status: 'completed',
                },
            });
            const updateResult = await this.prisma.donationData.updateMany({
                where: {
                    userId,
                    stripeCheckoutSessionId: session.id,
                    status: 'pending',
                },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            });
            if (updateResult.count === 0) {
                this.logger.warn(`No pending donation found for session ${session.id}`);
                return;
            }
            this.logger.log(`Donation for session ${session.id} completed successfully`);
        }
        catch (error) {
            this.logger.error('Error handling donation payment:', error);
        }
    }
    async handleMissionDonationPayment(session) {
        try {
            const userId = session.metadata?.userId;
            const vendorId = session.metadata?.vendorId;
            if (!userId) {
                this.logger.error('Missing userId in mission donation session metadata');
                return;
            }
            const paymentUpdateResult = await this.prisma.payment.updateMany({
                where: {
                    userId,
                    stripePaymentIntentId: session.id,
                    status: 'pending',
                    forPayment: 'missionDonation',
                },
                data: {
                    status: 'completed',
                },
            });
            const donationUpdateResult = await this.prisma.donationData.updateMany({
                where: {
                    userId,
                    stripeCheckoutSessionId: session.id,
                    status: 'pending',
                    action: 'missionDonation',
                },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            });
            if (paymentUpdateResult.count === 0 && donationUpdateResult.count === 0) {
                this.logger.warn(`No pending mission donation records found for session ${session.id}`);
                return;
            }
            this.logger.log(`Mission donation for session ${session.id} completed successfully`);
        }
        catch (error) {
            this.logger.error('Error handling mission donation payment:', error);
        }
    }
    async getPostDonationTotal(postId) {
        try {
            const result = await this.prisma.donationData.aggregate({
                _sum: {
                    amount: true,
                },
                where: {
                    postId,
                    status: 'completed',
                },
            });
            const totalDonation = result._sum.amount || 0;
            this.logger.log(`Total donation for post ${postId}: $${totalDonation}`);
            return { totalDonation };
        }
        catch (error) {
            this.logger.error('Error getting post donation total:', error);
            throw new common_1.BadRequestException('Failed to get post donation total');
        }
    }
    async missionPostDonation(userId, dto) {
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
            const productName = 'Mission Donation';
            const productDescription = `Donate $${dto.amount} to mission`;
            const metadataType = 'MissionDonation';
            this.logger.log(`Creating mission donation for user ${userId}: $${dto.amount}`);
            const successUrl = process.env.STRIPE_SUCCESS_URL;
            const cancelUrl = process.env.STRIPE_CANCEL_URL;
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: productName,
                                description: productDescription,
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
                    type: metadataType,
                },
                customer_email: user.email || undefined,
            });
            const paymentData = {
                userId,
                amount: Math.round(dto.amount * 100),
                currency: 'usd',
                stripePaymentIntentId: session.id,
                status: 'pending',
                forPayment: 'missionDonation',
            };
            const paymentRecord = await this.prisma.payment.create({
                data: paymentData,
            });
            const donationData = {
                userId,
                vendorId: dto.vendorId,
                postId: dto.postId,
                amount: dto.amount,
                stripeCheckoutSessionId: session.id,
                status: 'pending',
                action: 'missionDonation',
            };
            if (dto.purchaseTokenPrice !== undefined) {
                donationData.purchaseTokenPrice = dto.purchaseTokenPrice;
            }
            const donationRecord = await this.prisma.donationData.create({
                data: donationData,
            });
            const response = {
                id: donationRecord.id,
                amount: dto.amount,
                status: donationRecord.status,
                sessionUrl: session.url,
            };
            if (dto.purchaseTokenPrice !== undefined) {
                response.purchaseTokenPrice = dto.purchaseTokenPrice;
            }
            return response;
        }
        catch (error) {
            this.logger.error('Error creating mission donation:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to create mission donation');
        }
    }
};
exports.TokenPurchaseService = TokenPurchaseService;
exports.TokenPurchaseService = TokenPurchaseService = TokenPurchaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        token_service_1.TokenService,
        user_service_1.UserService,
        notification_service_1.NotificationService])
], TokenPurchaseService);
//# sourceMappingURL=token-purchase.service.js.map