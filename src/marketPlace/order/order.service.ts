import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DisputeStatus, OrderStatus, PaymentStatus, Prisma, TransferStatus } from '@prisma/client';
import Stripe from 'stripe';
import { ClosetChatService } from '../closet-chat/closet-chat.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderPayoutService } from './order-payout.service';

@Injectable()
export class OrderService {
    private readonly stripe: Stripe;
    private readonly marketplaceType = 'marketplace_mycloset';

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
        private readonly closetChatService: ClosetChatService,
        private readonly orderPayoutService: OrderPayoutService,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2024-06-20',
        });
    }

    private toMajor(valueMinor: number) {
        return Number((valueMinor / 100).toFixed(2));
    }

    private toMinor(valueMajor: number) {
        return Math.round(Number(valueMajor.toFixed(2)) * 100);
    }

    private async generateOrderNumber(tx: Prisma.TransactionClient) {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = String(now.getUTCMonth() + 1).padStart(2, '0');
        const d = String(now.getUTCDate()).padStart(2, '0');

        for (let attempt = 0; attempt < 5; attempt++) {
            const randomPart = Math.floor(10000 + Math.random() * 90000);
            const candidate = `MC-${y}${m}${d}-${randomPart}`;
            const existing = await tx.order.findUnique({
                where: { orderNumber: candidate },
                select: { id: true },
            });
            if (!existing) return candidate;
        }

        throw new BadRequestException('Unable to generate unique order number');
    }

    async createOrderFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
        if (paymentIntent.status !== 'succeeded') return;
        if (paymentIntent.metadata?.type !== this.marketplaceType) return;

        const paymentRecord = await this.prisma.marketPlacePayments.findFirst({
            where: {
                OR: [
                    { paymentIntentId: paymentIntent.id },
                    ...(paymentIntent.metadata?.paymentId ? [{ id: paymentIntent.metadata.paymentId }] : []),
                ],
            },
        });

        if (!paymentRecord) throw new NotFoundException('Marketplace payment record not found');

        const metadata = (paymentRecord.metadata as Prisma.JsonObject | null) || null;
        const itemsRaw = (metadata?.items as Prisma.JsonArray | undefined) || [];
        const addressId = typeof metadata?.addressId === 'string' ? metadata.addressId : '';

        if (!paymentRecord.userId || !paymentRecord.cartId || !itemsRaw.length || !addressId) {
            throw new BadRequestException('Payment metadata is incomplete for order creation');
        }

        const buyerId = paymentRecord.userId;
        const cartId = paymentRecord.cartId;

        let createdOrderIds: string[] = [];
        const sellerIdsToNotify = new Set<string>();

        await this.prisma.$transaction(async (tx) => {
            const existingOrders = await tx.order.findMany({
                where: { paymentId: paymentRecord.id },
                select: { id: true },
            });
            if (existingOrders.length) {
                createdOrderIds = existingOrders.map((existingOrder) => existingOrder.id);
                await tx.marketPlacePayments.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: 'PAID',
                        transactionId: typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null,
                        paymentIntentId: paymentIntent.id,
                        orderId: existingOrders[0].id,
                    },
                });
                return;
            }

            const address = await tx.userAddrees.findFirst({
                where: { id: addressId, userId: buyerId },
                select: { id: true },
            });
            if (!address) {
                throw new BadRequestException('Selected address is invalid for this user');
            }

            const parsedItems = itemsRaw.map((entry) => {
                const item = entry as Prisma.JsonObject;
                return {
                    productId: String(item.productId),
                    sellerId: String(item.sellerId),
                    quantity: Number(item.quantity),
                    unitPriceMinor: Number(item.unitPriceMinor),
                    subtotalMinor: Number(item.subtotalMinor),
                    shippingMinor: Number(item.shippingMinor ?? 0),
                };
            });

            // Group items by seller+closet, producing one order per seller closet.
            const grouped = new Map<string, {
                sellerId: string;
                closetId: string;
                items: Array<{
                    productId: string;
                    quantity: number;
                    unitPriceMinor: number;
                    subtotalMinor: number;
                    shippingMinor: number;
                    productName: string;
                    productImage: string;
                }>;
            }>();

            for (const item of parsedItems) {
                const product = await tx.closetItems.findUnique({
                    where: { id: item.productId },
                    select: {
                        id: true,
                        name: true,
                        images: true,
                        closetId: true,
                        quantity: true,
                        isActive: true,
                        isDeleted: true,
                    },
                });

                if (!product) throw new NotFoundException(`Product not found: ${item.productId}`);
                if (!product.isActive || product.isDeleted) throw new BadRequestException(`Product unavailable: ${product.name}`);
                if (product.quantity < item.quantity) {
                    throw new BadRequestException(`Only ${product.quantity} quantity available for ${product.name}`);
                }

                const key = `${item.sellerId}:${product.closetId}`;
                const group = grouped.get(key) || {
                    sellerId: item.sellerId,
                    closetId: product.closetId,
                    items: [],
                };

                group.items.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPriceMinor: item.unitPriceMinor,
                    subtotalMinor: item.subtotalMinor,
                    shippingMinor: item.shippingMinor,
                    productName: product.name,
                    productImage: product.images[0] || '',
                });

                grouped.set(key, group);
            }

            const platformFeePercent =
                typeof metadata?.platformFeePercent === 'number' ? metadata.platformFeePercent : 0.15;
            const sellerStripeAccountId =
                typeof metadata?.sellerStripeAccountId === 'string'
                    ? metadata.sellerStripeAccountId
                    : null;
            const stripeChargeId =
                typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null;

            // Fallback: resolve Connect account from seller if not in payment metadata (legacy payments).
            let resolvedSellerStripeAccountId = sellerStripeAccountId;
            if (!resolvedSellerStripeAccountId) {
                const firstSellerId = [...grouped.values()][0]?.sellerId;
                if (firstSellerId) {
                    const sellerUser = await tx.user.findUnique({
                        where: { id: firstSellerId },
                        select: { stripeAccountId: true },
                    });
                    resolvedSellerStripeAccountId = sellerUser?.stripeAccountId || null;
                }
            }

            for (const group of grouped.values()) {
                const subtotalMinor = group.items.reduce((sum, i) => sum + i.subtotalMinor, 0);
                const shippingMinor = group.items.reduce((sum, i) => sum + i.shippingMinor, 0);
                const totalMinor = subtotalMinor + shippingMinor;
                const platformFeeMinor = Math.round(totalMinor * platformFeePercent);
                const sellerAmountMinor = Math.max(0, totalMinor - platformFeeMinor);

                const order = await tx.order.create({
                    data: {
                        orderNumber: await this.generateOrderNumber(tx),
                        buyerId,
                        sellerId: group.sellerId,
                        closetId: group.closetId,
                        addressId,
                        paymentId: paymentRecord.id,
                        subtotal: this.toMajor(subtotalMinor),
                        shippingCost: this.toMajor(shippingMinor),
                        serviceFee: this.toMajor(platformFeeMinor),
                        total: this.toMajor(totalMinor),
                        paymentMethod: 'STRIPE',
                        paymentStatus: PaymentStatus.PAID,
                        orderStatus: OrderStatus.PENDING,
                        platformFeeMinor,
                        sellerAmountMinor,
                        sellerStripeAccountId: resolvedSellerStripeAccountId,
                        stripeChargeId,
                        transferStatus: TransferStatus.PENDING,
                        disputeStatus: DisputeStatus.NONE,
                    },
                });

                createdOrderIds.push(order.id);
                sellerIdsToNotify.add(group.sellerId);

                for (const item of group.items) {
                    await tx.orderItem.create({
                        data: {
                            orderId: order.id,
                            productId: item.productId,
                            productName: item.productName,
                            productImage: item.productImage,
                            quantity: item.quantity,
                            price: this.toMajor(item.unitPriceMinor),
                            subtotal: this.toMajor(item.subtotalMinor),
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
            }

            await tx.cartItems.deleteMany({ where: { cartId } });
            await tx.cart.deleteMany({ where: { id: cartId } });

            await tx.marketPlacePayments.update({
                where: { id: paymentRecord.id },
                data: {
                    status: 'PAID',
                    transactionId: typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null,
                    paymentIntentId: paymentIntent.id,
                    orderId: createdOrderIds[0] || null,
                },
            });

        });

        for (const orderId of createdOrderIds) {
            await this.closetChatService.ensureOrderPlacedThreadAndMessage(orderId);
        }

        for (const sellerId of sellerIdsToNotify) {
            await this.notificationService.sendNotificationToUser(
                sellerId,
                'You have a new order',
                'A buyer has placed a new order in your closet.',
                {
                    type: 'marketplace_order_paid',
                    paymentId: paymentRecord.id,
                },
            );
        }

        return { message: 'Order Created Successfully', orderIds: createdOrderIds };
    }

    async getBuyerOrders(userId: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        const orders = await this.prisma.order.findMany({
            where: { buyerId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    select: {
                        id: true,
                        productId: true,
                        productName: true,
                        productImage: true,
                        quantity: true,
                        price: true,
                        subtotal: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                images: true,
                                category: true,
                                brand: true,
                                condition: true,
                                isActive: true,
                                isDeleted: true,
                                shippingOption: true,
                                shippingFee: true,
                                estimateShippingTime: true,
                            },
                        },
                    },
                },
            },
        });

        return orders.map((order) => ({
            ...order,
            totalItemCount: order.items.length,
            items: order.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                productImage: item.productImage,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                product: item.product
                    ? {
                        id: item.product.id,
                        name: item.product.name,
                        images: item.product.images,
                        category: item.product.category,
                        brand: item.product.brand,
                        condition: item.product.condition,
                        isActive: item.product.isActive,
                        isDeleted: item.product.isDeleted,
                        shippingOption: item.product.shippingOption,
                        shippingFee: item.product.shippingFee,
                        estimateShippingTime: item.product.estimateShippingTime,
                    }
                    : null,
            })),
        }));
    }

    async getBuyerOrderDetails(userId: string, orderId: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                seller: {
                    select: {
                        userName: true,
                        image: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        productId: true,
                        productName: true,
                        productImage: true,
                        quantity: true,
                        price: true,
                        subtotal: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                images: true,
                                category: true,
                                brand: true,
                                condition: true,
                                isActive: true,
                                isDeleted: true,
                                shippingOption: true,
                                shippingFee: true,
                                estimateShippingTime: true,
                            },
                        },
                    },
                },
                address: true,
                payment: true,
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.buyerId !== userId) throw new UnauthorizedException('Unauthorized');

        return {
            ...order,
            totalItemCount: order.items.length,
            items: order.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                productImage: item.productImage,
                sellerUserName: order.seller?.userName || null,
                sellerImage: order.seller?.image || null,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                product: item.product
                    ? {
                        id: item.product.id,
                        name: item.product.name,
                        images: item.product.images,
                        category: item.product.category,
                        brand: item.product.brand,
                        condition: item.product.condition,
                        isActive: item.product.isActive,
                        isDeleted: item.product.isDeleted,
                        shippingOption: item.product.shippingOption,
                        shippingFee: item.product.shippingFee,
                        estimateShippingTime: item.product.estimateShippingTime,
                    }
                    : null,
            })),
        };
    }

    async cancelOrder(userId: string, orderId: string, reason?: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                payment: true,
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.buyerId !== userId) throw new UnauthorizedException('Unauthorized');

        const cancellableStatuses = new Set<OrderStatus>([OrderStatus.PENDING, OrderStatus.CONFIRMED]);
        if (!cancellableStatuses.has(order.orderStatus)) {
            throw new BadRequestException('Order cannot be cancelled in current status');
        }

        if (order.transferStatus === TransferStatus.RELEASED) {
            throw new BadRequestException('Order payout already released; contact support for refunds');
        }

        // Refund for paid order (funds still on platform — no Connect destination charge).
        if (order.paymentStatus === PaymentStatus.PAID && order.payment?.paymentIntentId) {
            await this.stripe.refunds.create({
                payment_intent: order.payment.paymentIntentId,
                amount: this.toMinor(order.total),
                metadata: {
                    orderId: order.id,
                    reason: reason || 'buyer_cancelled',
                },
            });
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: order.id },
                data: {
                    orderStatus: OrderStatus.CANCELLED,
                    paymentStatus: order.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : order.paymentStatus,
                    transferStatus: TransferStatus.FROZEN,
                },
            });

            for (const item of order.items) {
                await tx.closetItems.update({
                    where: { id: item.productId },
                    data: {
                        quantity: { increment: item.quantity },
                        soldCount: { decrement: item.quantity },
                    },
                });
            }

            if (order.paymentId) {
                await tx.marketPlacePayments.update({
                    where: { id: order.paymentId },
                    data: {
                        status: order.paymentStatus === PaymentStatus.PAID ? 'REFUNDED' : 'CANCELLED',
                    },
                });
            }
        });

        await this.notificationService.sendNotificationToUser(
            order.sellerId,
            'Order Cancelled',
            'A buyer cancelled an order.',
            {
                type: 'marketplace_order_cancelled',
                orderId: order.id,
            },
        );

        return { message: 'Order Cancelled Successfully' };
    }

    /**
     * Buyer confirms receipt during/after the protection window → release payout immediately.
     */
    async confirmOrderReceived(userId: string, orderId: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                buyerId: true,
                orderStatus: true,
                transferStatus: true,
                disputeStatus: true,
                orderNumber: true,
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.buyerId !== userId) throw new UnauthorizedException('Unauthorized');
        if (order.orderStatus !== OrderStatus.DELIVERED) {
            throw new BadRequestException('Order must be delivered before confirming receipt');
        }
        if (order.disputeStatus === DisputeStatus.OPEN) {
            throw new BadRequestException('Cannot confirm receipt while a dispute is open');
        }
        if (order.transferStatus === TransferStatus.RELEASED) {
            return {
                message: 'Payout already released',
                orderId: order.id,
                transferStatus: order.transferStatus,
            };
        }
        if (order.transferStatus === TransferStatus.FROZEN) {
            throw new BadRequestException('Payout is frozen; contact support');
        }

        // Ensure payout is scheduled, then release without waiting for the full 48h window.
        if (order.transferStatus === TransferStatus.PENDING) {
            await this.orderPayoutService.scheduleProtectionWindow(order.id);
        }

        const result = await this.orderPayoutService.releaseIfEligible(order.id, {
            skipProtectionCheck: true,
        });

        if (!result.released) {
            throw new BadRequestException(result.reason || 'Unable to release payout');
        }

        return {
            message: 'Receipt confirmed. Seller payout released.',
            orderNumber: order.orderNumber,
            ...result,
        };
    }

    /**
     * Buyer reports a delivery problem → freeze seller payout.
     */
    async reportOrderProblem(userId: string, orderId: string, reason?: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                buyerId: true,
                orderStatus: true,
                transferStatus: true,
                disputeStatus: true,
                orderNumber: true,
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.buyerId !== userId) throw new UnauthorizedException('Unauthorized');
        if (order.orderStatus !== OrderStatus.DELIVERED) {
            throw new BadRequestException('You can only report a problem after delivery');
        }
        if (order.transferStatus === TransferStatus.RELEASED) {
            throw new BadRequestException('Payout already released; contact support for chargebacks/disputes');
        }
        if (order.disputeStatus === DisputeStatus.OPEN) {
            return {
                message: 'Dispute already open',
                orderId: order.id,
                disputeStatus: order.disputeStatus,
                transferStatus: order.transferStatus,
            };
        }

        const frozen = await this.orderPayoutService.freezePayout(order.id, reason);

        return {
            message: 'Problem reported. Seller payout has been frozen.',
            orderId: frozen.id,
            orderNumber: order.orderNumber,
            transferStatus: frozen.transferStatus,
            disputeStatus: frozen.disputeStatus,
        };
    }
}
