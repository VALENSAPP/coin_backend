import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma, ShippingOptions } from '@prisma/client';
import Stripe from 'stripe';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMarketplacePaymentDto } from './dto/create-marketplace-payment.dto';

@Injectable()
export class PaymentService {
    private readonly stripe: Stripe;
    private readonly provider = 'STRIPE';
    private readonly marketplaceType = 'marketplace_mycloset';

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2024-06-20',
        });
    }

    private toMinorUnits(value: number) {
        return Math.round(Number(value.toFixed(2)) * 100);
    }

    private getShippingCost(option: ShippingOptions) {
        // Placeholder deterministic shipping rule until shipping matrix is available.
        if (option === 'ship_items') return 0;
        if (option === 'local_pick') return 0;
        return 0;
    }

    async createCheckoutSessionForCart(userId: string, dto: CreateMarketplacePaymentDto) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) throw new UnauthorizedException('User not authenticated');

        const cart = await this.prisma.cart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                cartItems: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                userId: true,
                                name: true,
                                price: true,
                                quantity: true,
                                isActive: true,
                                isDeleted: true,
                                shippingOption: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!cart || !cart.cartItems.length) {
            return { message: 'Cart is empty.' };
        }

        const validatedItems: Array<{
            productId: string;
            sellerId: string;
            quantity: number;
            unitPriceMinor: number;
            subtotalMinor: number;
            shippingMinor: number;
            name: string;
        }> = [];

        let subtotalMinor = 0;
        let shippingMinor = 0;

        for (const cartItem of cart.cartItems) {
            const product = cartItem.product;

            if (!product) {
                throw new NotFoundException(`Product not found for cart item ${cartItem.id}`);
            }

            if (!product.isActive) {
                throw new BadRequestException(`Product unavailable: ${product.name}`);
            }

            if (product.isDeleted) {
                throw new BadRequestException(`Product deleted: ${product.name}`);
            }

            if (product.quantity < cartItem.quantity) {
                throw new BadRequestException(`Only ${product.quantity} quantity available for ${product.name}`);
            }

            const latestPriceMinor = this.toMinorUnits(product.price);
            const itemSubtotalMinor = latestPriceMinor * cartItem.quantity;
            const itemShippingMinor = this.toMinorUnits(this.getShippingCost(product.shippingOption));

            subtotalMinor += itemSubtotalMinor;
            shippingMinor += itemShippingMinor;

            validatedItems.push({
                productId: product.id,
                sellerId: product.userId,
                quantity: cartItem.quantity,
                unitPriceMinor: latestPriceMinor,
                subtotalMinor: itemSubtotalMinor,
                shippingMinor: itemShippingMinor,
                name: product.name,
            });
        }

        const platformFeeMinor = 0;
        const grandTotalMinor = subtotalMinor + shippingMinor + platformFeeMinor;
        if (grandTotalMinor <= 0) {
            throw new BadRequestException('Invalid cart total for payment');
        }

        const currency = (dto.currency || 'usd').trim().toLowerCase();

        const successUrl = process.env.STRIPE_SUCCESS_URL as string;
        const cancelUrl = process.env.STRIPE_CANCEL_URL as string;
        if (!successUrl || !cancelUrl) {
            throw new BadRequestException('Missing STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL env vars');
        }

        const payment = await this.prisma.marketPlacePayments.create({
            data: {
                userId,
                cartId: cart.id,
                amount: grandTotalMinor,
                currency,
                provider: this.provider,
                status: 'PENDING',
                metadata: {
                    userId,
                    cartId: cart.id,
                    subtotalMinor,
                    shippingMinor,
                    platformFeeMinor,
                    grandTotalMinor,
                    items: validatedItems,
                },
            },
            select: { id: true },
        });

        let session: Stripe.Checkout.Session;
        try {
            session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                line_items: [
                    {
                        quantity: 1,
                        price_data: {
                            currency,
                            unit_amount: grandTotalMinor,
                            product_data: {
                                name: `My Closet Checkout (${cart.cartItems.length} item${cart.cartItems.length > 1 ? 's' : ''})`,
                            },
                        },
                    },
                ],
                metadata: {
                    type: this.marketplaceType,
                    paymentId: payment.id,
                    userId,
                    cartId: cart.id,
                },
                payment_intent_data: {
                    metadata: {
                        type: this.marketplaceType,
                        paymentId: payment.id,
                        userId,
                        cartId: cart.id,
                    },
                },
            });
        } catch {
            await this.prisma.marketPlacePayments.delete({ where: { id: payment.id } });
            throw new BadRequestException('Stripe API failure while creating checkout session');
        }

        await this.prisma.marketPlacePayments.update({
            where: { id: payment.id },
            data: {
                paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            },
        });

        return {
            checkoutUrl: session.url,
            checkoutSessionId: session.id,
            paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            amount: grandTotalMinor / 100,
            currency,
        };
    }

    async finalizeMarketplacePayment(paymentIntent: Stripe.PaymentIntent) {
        if (paymentIntent.status !== 'succeeded') return;
        const type = paymentIntent.metadata?.type;
        if (type !== this.marketplaceType) return;

        const paymentRecord = await this.prisma.marketPlacePayments.findFirst({
            where: {
                OR: [
                    { paymentIntentId: paymentIntent.id },
                    ...(paymentIntent.metadata?.paymentId ? [{ id: paymentIntent.metadata.paymentId }] : []),
                ],
            },
        });

        if (!paymentRecord) {
            throw new NotFoundException('Marketplace payment record not found');
        }

        if (paymentRecord.status === 'PAID') {
            return;
        }

        const metadata = (paymentRecord.metadata as Prisma.JsonObject | null) || null;
        const itemsRaw = (metadata?.items as Prisma.JsonArray | undefined) || [];

        if (!paymentRecord.userId || !paymentRecord.cartId || !itemsRaw.length) {
            throw new BadRequestException('Payment metadata is incomplete for finalization');
        }

        const buyerUserId = paymentRecord.userId;
        const buyerCartId = paymentRecord.cartId;

        let createdOrderId: string | null = null;
        let sellerIdsToNotify: string[] = [];

        await this.prisma.$transaction(async (tx) => {
            const existingOrder = await tx.marketPlaceOrder.findFirst({
                where: {
                    OR: [
                        { paymentId: paymentRecord.id },
                        { paymentIntentId: paymentIntent.id },
                    ],
                },
            });
            if (existingOrder) {
                await tx.marketPlacePayments.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: 'PAID',
                        transactionId: paymentIntent.latest_charge as string | null,
                        paymentIntentId: paymentIntent.id,
                        orderId: existingOrder.id,
                    },
                });
                return;
            }

            const parsedItems = itemsRaw.map((entry) => {
                const item = entry as Prisma.JsonObject;
                return {
                    productId: String(item.productId),
                    sellerId: String(item.sellerId),
                    quantity: Number(item.quantity),
                    unitPriceMinor: Number(item.unitPriceMinor),
                    subtotalMinor: Number(item.subtotalMinor),
                };
            });

            // Re-validate stock before mutating inventory.
            for (const item of parsedItems) {
                const product = await tx.closetItems.findUnique({
                    where: { id: item.productId },
                    select: {
                        id: true,
                        name: true,
                        quantity: true,
                        isActive: true,
                        isDeleted: true,
                    },
                });

                if (!product) throw new NotFoundException(`Product not found: ${item.productId}`);
                if (!product.isActive || product.isDeleted) {
                    throw new BadRequestException(`Product unavailable: ${product.name}`);
                }
                if (product.quantity < item.quantity) {
                    throw new BadRequestException(`Only ${product.quantity} quantity available for ${product.name}`);
                }
            }

            const order = await tx.marketPlaceOrder.create({
                data: {
                    userId: buyerUserId,
                    paymentId: paymentRecord.id,
                    paymentIntentId: paymentIntent.id,
                    totalAmount: paymentRecord.amount,
                    currency: paymentRecord.currency,
                    status: 'PAID',
                },
            });
            createdOrderId = order.id;
            sellerIdsToNotify = [...new Set(parsedItems.map((i) => i.sellerId))];

            for (const item of parsedItems) {
                await tx.marketPlaceOrderItem.create({
                    data: {
                        orderId: order.id,
                        productId: item.productId,
                        sellerId: item.sellerId,
                        quantity: item.quantity,
                        unitPrice: item.unitPriceMinor,
                        subtotal: item.subtotalMinor,
                    },
                });

                await tx.closetItems.update({
                    where: { id: item.productId },
                    data: {
                        quantity: { decrement: item.quantity },
                        soldCount: { increment: item.quantity },
                    },
                });
            }

            await tx.cartItems.deleteMany({
                where: { cartId: buyerCartId },
            });

            await tx.cart.deleteMany({
                where: { id: buyerCartId },
            });

            await tx.marketPlacePayments.update({
                where: { id: paymentRecord.id },
                data: {
                    status: 'PAID',
                    transactionId: paymentIntent.latest_charge as string | null,
                    paymentIntentId: paymentIntent.id,
                    orderId: order.id,
                },
            });
        });

        if (createdOrderId && sellerIdsToNotify.length) {
            for (const sellerId of sellerIdsToNotify) {
                await this.notificationService.sendNotificationToUser(
                    sellerId,
                    'New marketplace order',
                    'A buyer has placed an order for your closet item(s).',
                    {
                        type: 'marketplace_order_paid',
                        orderId: createdOrderId,
                        paymentId: paymentRecord.id,
                    },
                );
            }
        }
    }

    async markMarketplacePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
        const type = paymentIntent.metadata?.type;
        if (type !== this.marketplaceType) return;

        const paymentRecord = await this.prisma.marketPlacePayments.findFirst({
            where: {
                OR: [
                    { paymentIntentId: paymentIntent.id },
                    ...(paymentIntent.metadata?.paymentId ? [{ id: paymentIntent.metadata.paymentId }] : []),
                ],
            },
            select: { id: true, status: true },
        });

        if (!paymentRecord) return;
        if (paymentRecord.status === 'PAID') return;

        await this.prisma.marketPlacePayments.update({
            where: { id: paymentRecord.id },
            data: { status: 'FAILED' },
        });
    }
}
