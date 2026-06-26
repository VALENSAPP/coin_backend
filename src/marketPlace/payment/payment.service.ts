import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
    private stripe: Stripe;
    private static readonly PROVIDER = 'STRIPE';
    private static readonly TYPE = 'marketplace_payment';
    private static readonly PLATFORM_PERCENT = 0.15;

    constructor(private readonly prisma: PrismaService) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2024-06-20',
        });
    }

    private normalizeCurrency(currency: string) {
        const normalized = (currency || '').trim().toUpperCase();
        if (normalized.length !== 3) {
            throw new BadRequestException('Currency must be a valid 3-letter ISO code');
        }
        return normalized;
    }

    private toMinorUnits(amount: number) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }

        const cents = Math.round(amount * 100);
        if (cents <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }
        return cents;
    }

    private getAmountSplit(amountInMinorUnits: number) {
        const platformAmount = Math.round(amountInMinorUnits * PaymentService.PLATFORM_PERCENT);
        const ownerAmount = amountInMinorUnits - platformAmount;

        return {
            platformAmount,
            ownerAmount,
        };
    }

    private async requireConnectDestination(productOwnerId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: productOwnerId },
            select: { id: true, stripeAccountId: true },
        });

        if (!user) {
            throw new NotFoundException('Product owner not found');
        }

        if (!user.stripeAccountId) {
            throw new BadRequestException('Product owner must complete Stripe Connect onboarding');
        }

        const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
        if (!account.details_submitted || account.payouts_enabled === false) {
            throw new BadRequestException('Product owner Stripe Connect account is not ready for payouts');
        }

        return user.stripeAccountId;
    }

    async createPayment(payerUserId: string, dto: CreatePaymentDto) {
        if (!payerUserId) throw new BadRequestException('User authentication required');

        const currency = this.normalizeCurrency(dto.currency);
        const amountInMinorUnits = this.toMinorUnits(dto.amount);

        const existingPayment = await this.prisma.marketPlacePayments.findUnique({
            where: { orderId: dto.orderId },
        });

        if (existingPayment && ['CREATED', 'PENDING', 'SUCCEEDED'].includes(existingPayment.status)) {
            throw new ConflictException(`Payment already exists for order ${dto.orderId}`);
        }

        const destinationAccount = await this.requireConnectDestination(dto.productOwnerId);
        const { platformAmount, ownerAmount } = this.getAmountSplit(amountInMinorUnits);

        const baseData = {
            amount: amountInMinorUnits,
            currency,
            provider: PaymentService.PROVIDER,
            status: 'CREATED',
            transactionId: null,
            paymentIntentId: null,
        };

        const paymentRecord = existingPayment
            ? await this.prisma.marketPlacePayments.update({
                where: { id: existingPayment.id },
                data: baseData,
            })
            : await this.prisma.marketPlacePayments.create({
                data: {
                    orderId: dto.orderId,
                    ...baseData,
                },
            });

        const successUrl = process.env.STRIPE_SUCCESS_URL as string;
        const cancelUrl = process.env.STRIPE_CANCEL_URL as string;

        if (!successUrl || !cancelUrl) {
            throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
        }

        const session = await this.stripe.checkout.sessions.create({
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: undefined,
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: currency.toLowerCase(),
                        unit_amount: amountInMinorUnits,
                        product_data: {
                            name: `Marketplace Order ${dto.orderId}`,
                        },
                    },
                },
            ],
            payment_intent_data: {
                application_fee_amount: platformAmount,
                transfer_data: { destination: destinationAccount },
                metadata: {
                    type: PaymentService.TYPE,
                    paymentId: paymentRecord.id,
                    orderId: dto.orderId,
                    payerUserId,
                    productOwnerId: dto.productOwnerId,
                    splitOwner: ownerAmount.toString(),
                    splitPlatform: platformAmount.toString(),
                },
            },
            metadata: {
                type: PaymentService.TYPE,
                paymentId: paymentRecord.id,
                orderId: dto.orderId,
                payerUserId,
                productOwnerId: dto.productOwnerId,
                splitOwner: ownerAmount.toString(),
                splitPlatform: platformAmount.toString(),
            },
        });

        await this.prisma.marketPlacePayments.update({
            where: { id: paymentRecord.id },
            data: {
                status: 'PENDING',
                paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            },
        });

        return {
            paymentId: paymentRecord.id,
            orderId: dto.orderId,
            provider: PaymentService.PROVIDER,
            status: 'PENDING',
            amount: amountInMinorUnits,
            currency,
            split: {
                productOwner: ownerAmount,
                platform: platformAmount,
            },
            checkoutSessionId: session.id,
            checkoutUrl: session.url,
        };
    }

    async getPaymentById(paymentId: string) {
        if (!paymentId) throw new BadRequestException('paymentId is required');

        const payment = await this.prisma.marketPlacePayments.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return payment;
    }

    private async updateMarketplacePayment(where: { id?: string; orderId?: string; paymentIntentId?: string }, data: {
        status: string;
        paymentIntentId?: string | null;
        transactionId?: string | null;
    }) {
        const orFilters: Array<{ id?: string; orderId?: string; paymentIntentId?: string }> = [];
        if (where.id) orFilters.push({ id: where.id });
        if (where.orderId) orFilters.push({ orderId: where.orderId });
        if (where.paymentIntentId) orFilters.push({ paymentIntentId: where.paymentIntentId });

        if (!orFilters.length) return null;

        const existing = await this.prisma.marketPlacePayments.findFirst({
            where: { OR: orFilters },
            select: { id: true },
        });

        if (!existing) return null;

        return this.prisma.marketPlacePayments.update({
            where: { id: existing.id },
            data,
        });
    }

    private async applySuccessStatus(args: { paymentId?: string; orderId?: string; paymentIntentId?: string | null }) {
        const paymentIntentId = args.paymentIntentId || undefined;
        let transactionId: string | null = null;

        if (paymentIntentId) {
            const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            transactionId = typeof pi.latest_charge === 'string' ? pi.latest_charge : null;
        }

        const updateData = {
            status: 'SUCCEEDED',
            paymentIntentId: paymentIntentId ?? null,
            transactionId,
        };

        if (args.paymentId) {
            return this.updateMarketplacePayment({ id: args.paymentId }, updateData);
        }

        if (args.orderId) {
            return this.updateMarketplacePayment({ orderId: args.orderId }, updateData);
        }

        if (paymentIntentId) {
            return this.updateMarketplacePayment({ paymentIntentId }, updateData);
        }

        return null;
    }

    async handleStripeEvent(event: Stripe.Event) {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.metadata?.type !== PaymentService.TYPE) return;

                await this.applySuccessStatus({
                    paymentId: session.metadata?.paymentId,
                    orderId: session.metadata?.orderId,
                    paymentIntentId:
                        typeof session.payment_intent === 'string' ? session.payment_intent : null,
                });
                return;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                if (paymentIntent.metadata?.type !== PaymentService.TYPE) return;

                await this.applySuccessStatus({
                    paymentId: paymentIntent.metadata?.paymentId,
                    orderId: paymentIntent.metadata?.orderId,
                    paymentIntentId: paymentIntent.id,
                });
                return;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                if (paymentIntent.metadata?.type !== PaymentService.TYPE) return;

                await this.updateMarketplacePayment(
                    {
                        id: paymentIntent.metadata?.paymentId,
                        orderId: paymentIntent.metadata?.orderId,
                        paymentIntentId: paymentIntent.id,
                    },
                    {
                        status: 'FAILED',
                        paymentIntentId: paymentIntent.id,
                        transactionId: null,
                    },
                );
                return;
            }

            case 'payment_intent.canceled': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                if (paymentIntent.metadata?.type !== PaymentService.TYPE) return;

                await this.updateMarketplacePayment(
                    {
                        id: paymentIntent.metadata?.paymentId,
                        orderId: paymentIntent.metadata?.orderId,
                        paymentIntentId: paymentIntent.id,
                    },
                    {
                        status: 'CANCELED',
                        paymentIntentId: paymentIntent.id,
                    },
                );
                return;
            }

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
                if (!paymentIntentId) return;

                await this.updateMarketplacePayment(
                    { paymentIntentId },
                    {
                        status: 'REFUNDED',
                        paymentIntentId,
                        transactionId: charge.id,
                    },
                );
                return;
            }

            default:
                return;
        }
    }

    constructWebhookEvent(rawBody: Buffer, signature: string) {
        const endpointSecret =
            (process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET as string) ||
            (process.env.STRIPE_WEBHOOK_SECRET as string);

        if (!endpointSecret) {
            throw new BadRequestException('Missing STRIPE_MARKETPLACE_WEBHOOK_SECRET/STRIPE_WEBHOOK_SECRET env var');
        }

        return this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    }
}
