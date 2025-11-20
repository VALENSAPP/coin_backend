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
const schedule_1 = require("@nestjs/schedule");
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
                data: { hitLeft: 2 },
            });
        }
        else {
            await this.prisma.postHit.create({
                data: {
                    userId: user.id,
                    hitLeft: 7,
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
    async requestWithdrawal(userId, amount) {
        console.log(`[WITHDRAWAL_REQUEST] User ${userId} requesting withdrawal of $${amount}`);
        if (amount < 10) {
            console.warn(`[WITHDRAWAL_REQUEST] User ${userId} failed: amount $${amount} below minimum $10`);
            throw new common_1.BadRequestException('Minimum withdrawal amount is $10');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.user.updateMany({
                where: {
                    id: userId,
                    tokenBalance: { gte: amount },
                },
                data: {
                    tokenBalance: { decrement: amount },
                },
            });
            if (updated.count === 0) {
                const user = await tx.user.findUnique({ where: { id: userId } });
                if (!user) {
                    console.warn(`[WITHDRAWAL_REQUEST] User ${userId} not found`);
                    throw new common_1.BadRequestException('User not found');
                }
                console.warn(`[WITHDRAWAL_REQUEST] User ${userId} failed: insufficient balance. Required: $${amount}, Available: $${user.tokenBalance}`);
                throw new common_1.BadRequestException('Insufficient balance');
            }
            const withdrawal = await tx.withdrawalRecord.create({
                data: {
                    userId,
                    withdrawAmount: amount,
                    status: 'pending',
                },
            });
            return withdrawal;
        });
        console.log(`[WITHDRAWAL_REQUEST] User ${userId} withdrawal ${result.id} created successfully for $${amount}`);
        return {
            message: 'Withdrawal request submitted successfully',
            withdrawalId: result.id,
            amount,
            status: 'pending',
        };
    }
    async getWithdrawalHistory(userId) {
        return this.prisma.withdrawalRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async processWithdrawal(withdrawalId) {
        console.log(`[PROCESS_WITHDRAWAL] Starting processing for withdrawal ${withdrawalId}`);
        const claim = await this.prisma.withdrawalRecord.updateMany({
            where: { id: withdrawalId, status: 'pending' },
            data: { status: 'processing', processingAt: new Date() },
        });
        if (claim.count === 0) {
            console.warn(`[PROCESS_WITHDRAWAL] Withdrawal ${withdrawalId} not found or already processed`);
            throw new common_1.BadRequestException('Withdrawal not found or already processed');
        }
        console.log(`[PROCESS_WITHDRAWAL] Claimed withdrawal ${withdrawalId} for processing`);
        const withdrawal = await this.prisma.withdrawalRecord.findUnique({
            where: { id: withdrawalId },
            include: { user: true },
        });
        if (!withdrawal)
            throw new common_1.BadRequestException('Withdrawal not found');
        try {
            const user = withdrawal.user;
            if (!user.stripeAccountId) {
                console.warn(`[PROCESS_WITHDRAWAL] User ${user.id} needs Stripe Connect onboarding`);
                await this.prisma.withdrawalRecord.update({
                    where: { id: withdrawalId },
                    data: { status: 'requires_onboarding', failureReason: 'no_stripe_account' },
                });
                return { success: false, reason: 'user_needs_onboarding' };
            }
            const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
            const transfersEnabled = account.capabilities?.transfers === 'active';
            if (!transfersEnabled) {
                console.warn(`[PROCESS_WITHDRAWAL] User ${user.id} Stripe account transfers not enabled`);
                await this.prisma.withdrawalRecord.update({
                    where: { id: withdrawalId },
                    data: { status: 'requires_onboarding', failureReason: 'transfers_not_enabled' },
                });
                return { success: false, reason: 'transfers_not_enabled' };
            }
            const idempotencyKey = `withdrawal-${withdrawalId}-${withdrawal.withdrawAmount}`;
            const transfer = await this.stripe.transfers.create({
                amount: Math.round((withdrawal.withdrawAmount ?? 0) * 100),
                currency: 'usd',
                destination: user.stripeAccountId,
                description: `Withdrawal transfer for user ${user.id}`,
            }, { idempotencyKey });
            await this.prisma.withdrawalRecord.update({
                where: { id: withdrawalId },
                data: { txhash: transfer.id, status: 'processing_transfer' },
            });
            console.log(`[PROCESS_WITHDRAWAL] Transfer created successfully for withdrawal ${withdrawalId}: ${transfer.id}`);
            return { success: true, transferId: transfer.id };
        }
        catch (err) {
            console.error(`[PROCESS_WITHDRAWAL] Error processing withdrawal ${withdrawalId}:`, err?.message ?? err);
            await this.prisma.$transaction(async (tx) => {
                await tx.withdrawalRecord.update({
                    where: { id: withdrawalId },
                    data: { status: 'failed', failureReason: `${err?.message ?? 'unknown'}` },
                });
                await tx.user.update({
                    where: { id: withdrawal.userId },
                    data: { tokenBalance: { increment: withdrawal.withdrawAmount ?? 0 } },
                });
            });
            console.log(`[PROCESS_WITHDRAWAL] Withdrawal ${withdrawalId} marked as failed and balance refunded`);
            throw err;
        }
    }
    async createAccountOnboardingLink(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        let stripeAccountId = user.stripeAccountId;
        if (!stripeAccountId) {
            try {
                const account = await this.stripe.accounts.create({
                    type: 'express',
                    country: 'US',
                    email: user.email || undefined,
                    capabilities: { transfers: { requested: true } },
                });
                stripeAccountId = account.id;
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { stripeAccountId },
                });
            }
            catch (error) {
                console.error('Stripe error creating account:', {
                    message: error.message,
                    type: error.type,
                    code: error.code,
                    requestId: error.requestId,
                    raw: error.raw,
                });
                throw error;
                if (error.message?.includes('Connect') || error.message?.includes('signed up for Connect')) {
                    throw new common_1.BadRequestException('Stripe Connect is not enabled for this account. Please enable Stripe Connect in your Stripe dashboard at https://dashboard.stripe.com/connect/overview');
                }
                throw error;
            }
        }
        try {
            const accountLink = await this.stripe.accountLinks.create({
                account: stripeAccountId,
                refresh_url: `${process.env.FRONTEND_URL}/withdrawal/reauth`,
                return_url: `${process.env.FRONTEND_URL}/withdrawal/success`,
                type: 'account_onboarding',
            });
            return { onboardingUrl: accountLink.url };
        }
        catch (error) {
            console.error('Error creating account link:', error.message);
            throw new common_1.BadRequestException('Failed to create onboarding link. Please try again later.');
        }
    }
    async handlePayoutPaid(payout) {
        const withdrawal = await this.prisma.withdrawalRecord.findFirst({
            where: { txhash: payout.id },
        });
        if (withdrawal) {
            await this.prisma.withdrawalRecord.update({
                where: { id: withdrawal.id },
                data: { status: 'success' },
            });
        }
    }
    async handlePayoutFailed(payout) {
        const withdrawal = await this.prisma.withdrawalRecord.findFirst({
            where: { txhash: payout.id },
        });
        if (withdrawal) {
            await this.prisma.user.update({
                where: { id: withdrawal.userId },
                data: {
                    tokenBalance: {
                        increment: withdrawal.withdrawAmount ?? 0,
                    },
                },
            });
            await this.prisma.withdrawalRecord.update({
                where: { id: withdrawal.id },
                data: { status: 'failed' },
            });
        }
    }
    async handleTransferCreated(transfer) {
        const withdrawal = await this.prisma.withdrawalRecord.findFirst({
            where: { txhash: transfer.id },
        });
        if (withdrawal && withdrawal.status === 'processing_transfer') {
            console.log(`Transfer created for withdrawal ${withdrawal.id}: ${transfer.id}`);
        }
    }
    async buyHit(amount, hitCount, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Buy ${hitCount} Hits`,
                            description: `Purchase ${hitCount} additional hits for posting`,
                        },
                        unit_amount: amount * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: process.env.STRIPE_SUCCESS_URL,
            cancel_url: process.env.STRIPE_CANCEL_URL,
            metadata: {
                type: 'buy_hit',
                userId: userId,
                hitCount: hitCount.toString(),
            },
            customer_email: user.email || undefined,
        });
        await this.prisma.payment.create({
            data: {
                userId: userId,
                amount: amount,
                currency: 'USD',
                status: 'pending',
                forPayment: 'buyHit',
                stripePaymentIntentId: session.payment_intent,
            },
        });
        return { sessionId: session.id, url: session.url };
    }
    async createFansPageSubscriptionCheckoutSession(userId) {
        const customerId = await this.ensureStripeCustomer(userId);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const price = await this.stripe.prices.retrieve('price_1STKIwEfZnDK6m7OP2vahCdr');
        const amount = price.unit_amount || 0;
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: customerId,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Fans Page Subscription',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: process.env.STRIPE_SUCCESS_URL,
            cancel_url: process.env.STRIPE_CANCEL_URL,
            metadata: {
                type: 'fans_page_subscription',
                userId: userId,
            },
        });
        await this.prisma.payment.create({
            data: {
                userId: userId,
                amount: amount,
                currency: 'USD',
                status: 'pending',
                forPayment: 'fanSubscription',
                stripePaymentIntentId: session.payment_intent,
            },
        });
        return { sessionId: session.id, url: session.url };
    }
    async handleFansPageSubscriptionPayment(session) {
        const userId = session.metadata?.userId;
        if (!userId) {
            console.error('Missing userId in fans_page_subscription session metadata');
            return;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.error(`User ${userId} not found for fans_page_subscription payment`);
            return;
        }
        const paymentIntentId = session.payment_intent;
        await this.prisma.payment.updateMany({
            where: {
                userId: userId,
                stripePaymentIntentId: paymentIntentId,
                forPayment: 'fanSubscription',
                status: 'pending'
            },
            data: {
                status: 'succeeded',
                amount: session.amount_total || 0,
                currency: session.currency?.toUpperCase() || 'USD',
            },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { fansPage: 1 },
        });
        console.log(`✅ Fans page subscription payment processed: User ${userId} fansPage set to 1`);
    }
    async handleBuyHitPayment(session) {
        const userId = session.metadata?.userId;
        const hitCount = parseInt(session.metadata?.hitCount || '0');
        if (!userId || !hitCount) {
            console.error('Missing userId or hitCount in buy_hit session metadata');
            return;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.error(`User ${userId} not found for buy_hit payment`);
            return;
        }
        const paymentIntentId = session.payment_intent;
        await this.prisma.payment.updateMany({
            where: {
                userId: userId,
                stripePaymentIntentId: paymentIntentId,
                forPayment: 'buyHit',
                status: 'pending'
            },
            data: {
                status: 'succeeded',
                amount: session.amount_total || 0,
                currency: session.currency?.toUpperCase() || 'USD',
            },
        });
        const existingPostHit = await this.prisma.postHit.findFirst({
            where: { userId: userId },
        });
        if (existingPostHit) {
            await this.prisma.postHit.update({
                where: { id: existingPostHit.id },
                data: {
                    hitLeft: {
                        increment: hitCount
                    }
                },
            });
        }
        else {
            await this.prisma.postHit.create({
                data: {
                    userId: userId,
                    hitLeft: hitCount,
                },
            });
        }
        console.log(`✅ Buy hit payment processed: User ${userId} received ${hitCount} hits`);
    }
    async processPendingWithdrawals() {
        console.log('[CRON] Processing pending withdrawals...');
        const pendingWithdrawals = await this.prisma.withdrawalRecord.findMany({
            where: { status: 'pending' },
            select: { id: true },
        });
        if (pendingWithdrawals.length === 0) {
            console.log('[CRON] No pending withdrawals to process');
            return;
        }
        console.log(`[CRON] Found ${pendingWithdrawals.length} pending withdrawals to process`);
        for (const withdrawal of pendingWithdrawals) {
            try {
                await this.processWithdrawal(withdrawal.id);
                console.log(`[CRON] Successfully processed withdrawal ${withdrawal.id}`);
            }
            catch (error) {
                console.error(`[CRON] Failed to process withdrawal ${withdrawal.id}:`, error.message);
            }
        }
        console.log('[CRON] Finished processing pending withdrawals');
    }
};
exports.BillingService = BillingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingService.prototype, "processPendingWithdrawals", null);
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map