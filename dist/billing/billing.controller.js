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
exports.BillingController = exports.RequestWithdrawalDto = void 0;
const common_1 = require("@nestjs/common");
const billing_service_1 = require("./billing.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const buy_hit_dto_1 = require("./dto/buy-hit.dto");
const buy_fan_subscription_dto_1 = require("./dto/buy-fan-subscription.dto");
class RequestWithdrawalDto {
    amount;
}
exports.RequestWithdrawalDto = RequestWithdrawalDto;
__decorate([
    (0, swagger_2.ApiProperty)({
        description: 'Amount to withdraw in USD',
        example: 50.00,
        minimum: 10
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(10),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], RequestWithdrawalDto.prototype, "amount", void 0);
let BillingController = class BillingController {
    billingService;
    constructor(billingService) {
        this.billingService = billingService;
    }
    async createSubscription(req) {
        const userId = req.user.userId;
        const session = await this.billingService.createCheckoutSession(userId);
        return { url: session.url };
    }
    async cancelSubscription(req) {
        const userId = req.user.userId;
        const result = await this.billingService.cancelSubscriptionAtPeriodEnd(userId);
        return { message: 'Subscription will cancel at period end', result };
    }
    async createOneTimePayment(req, body) {
        const userId = req.user.userId;
        const { amount } = body;
        if (!amount || amount <= 0) {
            throw new common_1.BadRequestException('Invalid amount');
        }
        const session = await this.billingService.createOneTimePaymentCheckoutSession(userId, amount);
        return { url: session.url };
    }
    async getMySubscription(req) {
        const userId = req.user.userId;
        const details = await this.billingService.getSubscriptionDetails(userId);
        return { subscription: details };
    }
    async getLatestTransactions(req) {
        const userId = req.user.userId;
        const transactions = await this.billingService.getLatestTransactions(userId);
        return { transactions };
    }
    async requestWithdrawal(req, dto) {
        const userId = req.user.userId;
        const result = await this.billingService.requestWithdrawal(userId, dto.amount);
        return result;
    }
    async getWithdrawalHistory(req) {
        const userId = req.user.userId;
        const history = await this.billingService.getWithdrawalHistory(userId);
        return { withdrawals: history };
    }
    async createOnboardingLink(req) {
        const userId = req.user.userId;
        const result = await this.billingService.createAccountOnboardingLink(userId);
        return result;
    }
    async buyHit(req, dto) {
        const userId = req.user.userId;
        if (dto.userId !== userId) {
            throw new common_1.BadRequestException('User ID mismatch');
        }
        const result = await this.billingService.buyHit(dto.amount, dto.hitCount, dto.userId);
        return { message: 'Checkout session created', ...result };
    }
    async fansPageSubscription(req) {
        const userId = req.user.userId;
        const session = await this.billingService.createFansPageSubscriptionCheckoutSession(userId);
        return { url: session.url };
    }
    async buyFanSubscription(req, dto) {
        const userId = req.user.userId;
        if (dto.fanUserId !== userId) {
            throw new common_1.BadRequestException('Fan user ID mismatch');
        }
        const result = await this.billingService.createOneTimePaymentCheckForFanSubscription(dto.amount, dto.buyUserId, dto.fanUserId);
        return { message: 'Checkout session created', ...result };
    }
    async getUserBuyFanSubscriptionList(userId) {
        const subscriptions = await this.billingService.getUserBuyFanSubscriptionList(userId);
        return { subscriptions };
    }
    async fanSubscriptionUserList(userId) {
        const subscriptions = await this.billingService.fanSubscriptionUserList(userId);
        return { subscriptions };
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe Checkout Session for subscription (uses env vars)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel subscription at period end' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('pay-following'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe Checkout Session for one-time following payment' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                amount: {
                    type: 'number',
                    description: 'Payment amount in USD',
                    example: 10.00,
                },
            },
            required: ['amount'],
        },
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createOneTimePayment", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user subscription details' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getMySubscription", null);
__decorate([
    (0, common_1.Get)('get-latest-transactions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest transactions for the user' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getLatestTransactions", null);
__decorate([
    (0, common_1.Post)('request-withdrawal'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Request withdrawal to connected Stripe account' }),
    (0, swagger_1.ApiBody)({ type: RequestWithdrawalDto }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, RequestWithdrawalDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "requestWithdrawal", null);
__decorate([
    (0, common_1.Get)('withdrawal-history'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user withdrawal history' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getWithdrawalHistory", null);
__decorate([
    (0, common_1.Post)('create-onboarding-link'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe Connect onboarding link for withdrawals' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createOnboardingLink", null);
__decorate([
    (0, common_1.Post)('buy-hit'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe Checkout Session for buying hits' }),
    (0, swagger_1.ApiBody)({ type: buy_hit_dto_1.BuyHitDto }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, buy_hit_dto_1.BuyHitDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "buyHit", null);
__decorate([
    (0, common_1.Post)('fans-page-subscription'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe Checkout Session for fans page subscription' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "fansPageSubscription", null);
__decorate([
    (0, common_1.Post)('buy-fan-subscription'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe Checkout Session for buying fan subscription' }),
    (0, swagger_1.ApiBody)({ type: buy_fan_subscription_dto_1.BuyFanSubscriptionDto }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, buy_fan_subscription_dto_1.BuyFanSubscriptionDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "buyFanSubscription", null);
__decorate([
    (0, common_1.Get)('user-buy-fan-subscription-list'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of fans who bought subscription to the user' }),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getUserBuyFanSubscriptionList", null);
__decorate([
    (0, common_1.Get)('fan-subscription-user-list'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of subscriptions bought by the fan user' }),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "fanSubscriptionUserList", null);
exports.BillingController = BillingController = __decorate([
    (0, swagger_1.ApiTags)('billing'),
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map