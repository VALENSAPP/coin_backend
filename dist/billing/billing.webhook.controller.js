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
exports.BillingWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const stripe_1 = require("stripe");
const billing_service_1 = require("./billing.service");
const token_purchase_service_1 = require("../token-purchase/token-purchase.service");
let BillingWebhookController = class BillingWebhookController {
    billingService;
    tokenPurchaseService;
    stripe;
    constructor(billingService, tokenPurchaseService) {
        this.billingService = billingService;
        this.tokenPurchaseService = tokenPurchaseService;
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20',
        });
    }
    async handleWebhook(req, signature) {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
        }
        catch (err) {
            console.error('Webhook signature verification failed.', err.message);
            return { received: true };
        }
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                if (session.metadata?.type === 'token_purchase') {
                    await this.tokenPurchaseService.handleCheckoutSessionCompleted(session.id);
                }
                else if (session.metadata?.type === 'buy_hit') {
                    await this.billingService.handleBuyHitPayment(session);
                }
                else if (session.metadata?.type === 'fans_page_subscription') {
                    await this.billingService.handleFansPageSubscriptionPayment(session);
                }
                else if (session.metadata?.type === 'fan_subscription_buy') {
                    console.log(`Webhook: Handling fan_subscription_buy for session ${session.id}`);
                    await this.billingService.handleFanSubscriptionBuyPayment(session);
                }
                else if (session.metadata?.type === 'donation') {
                    console.log(`Webhook: Handling donation for session ${session.id}`);
                    await this.tokenPurchaseService.handleDonationPayment(session);
                }
                else {
                    await this.billingService.handleCheckoutSessionCompleted(session);
                }
                break;
            case 'invoice.paid':
                await this.billingService.handleInvoicePaid(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this.billingService.handleInvoicePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.billingService.handleSubscriptionDeleted(event.data.object);
                break;
            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentIntentFailed(event.data.object);
                break;
            case 'checkout.session.expired':
                await this.handleCheckoutSessionExpired(event.data.object);
                break;
            case 'transfer.created':
                await this.billingService.handleTransferCreated(event.data.object);
                break;
            case 'payout.paid':
                await this.billingService.handlePayoutPaid(event.data.object);
                break;
            case 'payout.failed':
                await this.billingService.handlePayoutFailed(event.data.object);
                break;
            default:
                break;
        }
        return { received: true };
    }
    async handlePaymentIntentSucceeded(paymentIntent) {
        try {
            if (paymentIntent.metadata?.type === 'token_purchase') {
                await this.tokenPurchaseService.handlePaymentSuccess(paymentIntent.id);
            }
            else if (paymentIntent.metadata?.type === 'following') {
                await this.billingService.handleOneTimePaymentSuccess(paymentIntent);
            }
        }
        catch (error) {
            console.error('Error handling payment intent success:', error);
        }
    }
    async handlePaymentIntentFailed(paymentIntent) {
        try {
            if (paymentIntent.metadata?.type === 'token_purchase') {
                await this.tokenPurchaseService.handlePaymentFailed(paymentIntent.id);
            }
        }
        catch (error) {
            console.error('Error handling payment intent failure:', error);
        }
    }
    async handleCheckoutSessionExpired(session) {
        try {
            if (session.metadata?.type === 'token_purchase') {
                await this.tokenPurchaseService.handleCheckoutSessionExpired(session.id);
            }
        }
        catch (error) {
            console.error('Error handling checkout session expiration:', error);
        }
    }
};
exports.BillingWebhookController = BillingWebhookController;
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingWebhookController.prototype, "handleWebhook", null);
exports.BillingWebhookController = BillingWebhookController = __decorate([
    (0, swagger_1.ApiExcludeController)(),
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService,
        token_purchase_service_1.TokenPurchaseService])
], BillingWebhookController);
//# sourceMappingURL=billing.webhook.controller.js.map