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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_1 = require("stripe");
let BillingService = class BillingService {
    prisma;
    stripe;
    constructor(prisma) {
        this.prisma = prisma;
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20',
        });
    }
    async ensureStripeCustomer(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.stripeCustomerId)
            return user.stripeCustomerId;
        const customer = await this.stripe.customers.create({
            metadata: { userId },
            email: user.email || undefined,
        });
        await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
        return customer.id;
    }
    async createCheckoutSession(userId) {
        const customerId = await this.ensureStripeCustomer(userId);
        const priceId = process.env.STRIPE_PRICE_ID;
        const successUrl = process.env.STRIPE_SUCCESS_URL;
        const cancelUrl = process.env.STRIPE_CANCEL_URL;
        if (!priceId || !successUrl || !cancelUrl) {
            throw new common_1.BadRequestException('Missing STRIPE_PRICE_ID/STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
        }
        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata: { userId },
        });
        return session;
    }
    async createOneTimePaymentCheckoutSession(userId, amount) {
        const customerId = await this.ensureStripeCustomer(userId);
        const successUrl = process.env.STRIPE_SUCCESS_URL;
        const cancelUrl = process.env.STRIPE_CANCEL_URL;
        if (!successUrl || !cancelUrl) {
            throw new common_1.BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
        }
        const session = await this.stripe.checkout.sessions.create({
            mode: 'payment',
            customer: customerId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Following Payment',
                        },
                        unit_amount: amount * 100,
                    },
                    quantity: 1,
                },
            ],
            metadata: { userId, type: 'following', amount: amount.toString() },
        });
        return session;
    }
    async cancelSubscriptionAtPeriodEnd(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        let subscriptionId = user.stripeSubscriptionId || null;
        if (!subscriptionId && user.stripeCustomerId) {
            const list = await this.stripe.subscriptions.list({ customer: user.stripeCustomerId, status: 'active', limit: 1 });
            const activeSub = list.data[0];
            if (activeSub) {
                subscriptionId = activeSub.id;
                await this.prisma.user.update({ where: { id: userId }, data: { stripeSubscriptionId: subscriptionId } });
            }
        }
        if (!subscriptionId)
            throw new common_1.BadRequestException('No active subscription');
        const sub = await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
        await this.prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: 'CANCELED' } });
        return sub;
    }
    async getSubscriptionDetails(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        return {
            status: user.subscriptionStatus,
            start: user.subscriptionStart,
            end: user.subscriptionEnd,
            currentPeriodEnd: user.currentPeriodEnd,
        };
    }
    async handleInvoicePaid(invoice) {
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId)
            return;
        const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (!user)
            return;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        const amount = invoice.amount_paid ?? 0;
        const currency = invoice.currency?.toUpperCase() ?? 'USD';
        const periodStart = invoice.lines.data[0]?.period?.start
            ? new Date(invoice.lines.data[0].period.start * 1000)
            : undefined;
        const periodEnd = invoice.lines.data[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000) : undefined;
        await this.prisma.payment.create({
            data: {
                userId: user.id,
                amount: amount,
                currency,
                status: 'succeeded',
                forPayment: 'subscription',
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id,
                periodStart,
                periodEnd,
            },
        });
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                subscriptionStatus: 'ACTIVE',
                stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId ?? undefined,
                subscriptionStart: user.subscriptionStart ?? (periodStart || new Date()),
                subscriptionEnd: null,
                currentPeriodEnd: periodEnd,
            },
        });
        const postHit = await this.prisma.postHit.findFirst({
            where: { userId: user.id },
        });
        if (postHit) {
            await this.prisma.postHit.update({
                where: { id: postHit.id },
                data: { hitLeft: {
                        increment: 5
                    } },
            });
        }
        else {
            await this.prisma.postHit.create({
                data: {
                    userId: user.id,
                    hitLeft: 5,
                },
            });
        }
    }
    async handleInvoicePaymentFailed(invoice) {
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId)
            return;
        const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (!user)
            return;
        const currency = invoice.currency?.toUpperCase() ?? 'USD';
        await this.prisma.payment.create({
            data: {
                userId: user.id,
                amount: invoice.amount_due ?? 0,
                currency,
                status: 'failed',
                forPayment: 'subscription',
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id,
                periodStart: undefined,
                periodEnd: undefined,
            },
        });
        await this.prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: 'PAST_DUE' } });
    }
    async handleSubscriptionDeleted(subscription) {
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        if (!customerId)
            return;
        const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (!user)
            return;
        const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                subscriptionStatus: 'INACTIVE',
                subscriptionEnd: currentPeriodEnd,
                currentPeriodEnd: currentPeriodEnd,
                stripeSubscriptionId: null,
            },
        });
    }
    async handleCheckoutSessionCompleted(session) {
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (!customerId || !subscriptionId)
            return;
        const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (!user)
            return;
        await this.prisma.user.update({
            where: { id: user.id },
            data: { stripeSubscriptionId: subscriptionId },
        });
    }
    async handleOneTimePaymentSuccess(paymentIntent) {
        const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
        if (!customerId)
            return;
        const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (!user)
            return;
        const amount = paymentIntent.amount ?? 0;
        const currency = paymentIntent.currency?.toUpperCase() ?? 'USD';
        await this.prisma.payment.create({
            data: {
                userId: user.id,
                amount: amount,
                currency,
                status: 'succeeded',
                forPayment: 'following',
                stripePaymentIntentId: paymentIntent.id,
            },
        });
    }
    async getLatestTransactions(userId) {
        return this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map