import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
    UnauthorizedException,
    forwardRef,
} from '@nestjs/common';
import { CartItemShippingChoice, OrderStatus, Prisma, ShippingStatus } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { SellerOrderListQueryDto, SellerOrderShippingType } from './dto/seller-order-list-query.dto';
import { ShipOrderDto } from './dto/ship-order.dto';
import { OrderPayoutService } from './order-payout.service';

@Injectable()
export class SellerOrderService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
        private readonly orderPayoutService: OrderPayoutService,
        @Inject(forwardRef(() => ShippingService))
        private readonly shippingService: ShippingService,
    ) { }

    private assertSellerUserId(userId?: string): string {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        return userId;
    }

    private async getOwnedOrderOrThrow(sellerId: string, orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: { select: { id: true, userName: true, displayName: true, email: true, image: true } },
                address: true,
                payment: true,
                items: true,
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.sellerId !== sellerId) throw new ForbiddenException('Forbidden: you do not own this order');

        return order;
    }

    private ensureTransition(current: OrderStatus, expectedCurrent: OrderStatus, next: OrderStatus) {
        if (current !== expectedCurrent) {
            throw new BadRequestException(
                `Invalid status transition. Allowed: ${expectedCurrent} -> ${next}. Current status: ${current}`,
            );
        }
    }

    private async sendDeliveryOtpEmail(to: string, buyerName: string, orderNumber: string, otp: string, expiresInMinutes: number) {
        try {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

            await sgMail.send({
                to,
                from: process.env.SENDGRID_FROM_EMAIL!,
                subject: `Delivery OTP for order ${orderNumber}`,
                text: `Hi ${buyerName}, your OTP to confirm handover for order ${orderNumber} is ${otp}. This OTP is valid for ${expiresInMinutes} minutes. Share this OTP with seller only after receiving your product.`,
                html: `<p>Hi ${buyerName},</p><p>Your OTP to confirm handover for order <strong>${orderNumber}</strong> is:</p><h2 style="letter-spacing:4px;">${otp}</h2><p>This OTP is valid for <strong>${expiresInMinutes} minutes</strong>.</p><p>Share this OTP with seller only after receiving your product.</p>`,
            });
        } catch (error) {
            console.error('SendGrid error while sending delivery OTP:', error);
            throw new BadRequestException('Failed to send delivery OTP email');
        }
    }

    async sendDeliveryOtp(userId: string | undefined, orderId: string, expiresInMinutes = 10) {
        const sellerId = this.assertSellerUserId(userId);
        const order = await this.getOwnedOrderOrThrow(sellerId, orderId);

        this.ensureTransition(order.orderStatus, OrderStatus.PROCESSING, OrderStatus.DELIVERED);

        if (!order.buyer?.email) {
            throw new BadRequestException('Buyer email is not available for this order');
        }

        const ttlMinutes = Math.min(Math.max(expiresInMinutes, 1), 30);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await this.prisma.order.update({
            where: { id: order.id },
            data: {
                deliveryOtp: otp,
                deliveryOtpExpiresAt: otpExpiresAt,
                deliveryOtpSentAt: new Date(),
            },
        });

        const buyerName = order.buyer.displayName || order.buyer.userName || 'Buyer';
        await this.sendDeliveryOtpEmail(order.buyer.email, buyerName, order.orderNumber, otp, ttlMinutes);

        return {
            message: 'Delivery OTP sent to buyer email successfully',
            orderId: order.id,
            orderStatus: order.orderStatus,
            otpExpiresAt,
        };
    }

    async getSellerOrders(userId: string | undefined, query: SellerOrderListQueryDto) {
        const sellerId = this.assertSellerUserId(userId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const shippingType = query.shippingType ?? SellerOrderShippingType.ALL;

        const shippingTypeWhere: Prisma.OrderWhereInput =
            shippingType === SellerOrderShippingType.LOCAL_PICKUP
                ? { items: { some: { selectedShippingChoice: CartItemShippingChoice.local_pick } } }
                : shippingType === SellerOrderShippingType.SHIP_TO_DELIVER
                    ? { items: { some: { selectedShippingChoice: CartItemShippingChoice.ship_items } } }
                    : {};

        const where: Prisma.OrderWhereInput = {
            sellerId,
            ...(query.status ? { orderStatus: query.status } : {}),
            ...shippingTypeWhere,
        };

        const [total, orders] = await this.prisma.$transaction([
            this.prisma.order.count({ where }),
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    orderNumber: true,
                    total: true,
                    orderStatus: true,
                    createdAt: true,
                    buyer: {
                        select: {
                            id: true,
                            userName: true,
                            displayName: true,
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
                            selectedShippingChoice: true,
                            selectedShippingFee: true,
                            pickupAddress: true,
                            pickupAvailableHours: true,
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
            }),
        ]);

        return {
            data: orders.map((order) => {
                const isLocalPickupOrder =
                    order.items.length > 0 &&
                    order.items.every((item) => item.selectedShippingChoice === CartItemShippingChoice.local_pick);

                return {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    buyerId: order.buyer.id,
                    buyerName: order.buyer.displayName || order.buyer.userName || 'Unknown Buyer',
                    totalAmount: order.total,
                    orderStatus:
                        isLocalPickupOrder && order.orderStatus === OrderStatus.PENDING
                            ? 'localpickup'
                            : order.orderStatus,
                    createdAt: order.createdAt,
                    totalItemCount: order.items.length,
                    items: order.items.map((item) => ({
                        id: item.id,
                        productId: item.productId,
                        productName: item.productName,
                        productImage: item.productImage,
                        quantity: item.quantity,
                        price: item.price,
                        subtotal: item.subtotal,
                        selectedShippingChoice: item.selectedShippingChoice,
                        selectedShippingFee: item.selectedShippingFee,
                        pickupAddress:
                            item.selectedShippingChoice === CartItemShippingChoice.local_pick
                                ? item.pickupAddress
                                : null,
                        pickupAvailableHours:
                            item.selectedShippingChoice === CartItemShippingChoice.local_pick
                                ? item.pickupAvailableHours
                                : null,
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
            }),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getSellerOrderDetails(userId: string | undefined, orderId: string) {
        const sellerId = this.assertSellerUserId(userId);
        return this.getOwnedOrderOrThrow(sellerId, orderId);
    }

    async markOrderProcessing(userId: string | undefined, orderId: string) {
        const sellerId = this.assertSellerUserId(userId);
        const order = await this.getOwnedOrderOrThrow(sellerId, orderId);

        this.ensureTransition(order.orderStatus, OrderStatus.PENDING, OrderStatus.PROCESSING);

        const updatedOrder = await this.prisma.order.update({
            where: { id: order.id },
            data: { orderStatus: OrderStatus.PROCESSING },
            select: { id: true, orderStatus: true, buyerId: true, orderNumber: true },
        });

        await this.notificationService.sendNotificationToUser(
            updatedOrder.buyerId,
            'Order Update',
            'Your order is now being prepared.',
            {
                type: 'seller_order_processing',
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
            },
        );

        return {
            message: 'Order marked as processing successfully',
            orderId: updatedOrder.id,
            orderStatus: updatedOrder.orderStatus,
        };
    }

    async markOrderShipped(userId: string | undefined, orderId: string, dto: ShipOrderDto) {
        const sellerId = this.assertSellerUserId(userId);
        const order = await this.getOwnedOrderOrThrow(sellerId, orderId);

        this.ensureTransition(order.orderStatus, OrderStatus.PROCESSING, OrderStatus.SHIPPED);

        const carrier = dto.carrier.trim();
        const trackingNumber = dto.trackingNumber.trim();
        if (!carrier || !trackingNumber) {
            throw new BadRequestException('carrier and trackingNumber are required');
        }

        // EasyPost when configured; otherwise manual ship proceeds unchanged.
        const trackerResult = await this.shippingService.createTrackerForOrder({
            orderId: order.id,
            carrier,
            trackingNumber,
        });

        const shippingProvider = trackerResult.skipped ? 'MANUAL' : 'EASYPOST';
        const shippingStatus = trackerResult.skipped
            ? ShippingStatus.TRACKING_SUBMITTED
            : trackerResult.shippingStatus;

        const updatedOrder = await this.prisma.order.update({
            where: { id: order.id },
            data: {
                orderStatus: OrderStatus.SHIPPED,
                shippingCarrier: carrier,
                trackingNumber,
                shippingProvider,
                shippingStatus,
                easypostTrackerId: trackerResult.trackerId || null,
                trackingValidatedAt: trackerResult.trackingValidatedAt || null,
                lastTrackingPayload: trackerResult.raw
                    ? (trackerResult.raw as Prisma.InputJsonValue)
                    : undefined,
            },
            select: {
                id: true,
                orderStatus: true,
                buyerId: true,
                orderNumber: true,
                shippingCarrier: true,
                trackingNumber: true,
                shippingStatus: true,
                shippingProvider: true,
                easypostTrackerId: true,
                trackingValidatedAt: true,
            },
        });

        await this.notificationService.sendNotificationToUser(
            updatedOrder.buyerId,
            'Order Shipped',
            trackerResult.skipped
                ? 'Your order has been shipped.'
                : 'Your order has been shipped. Tracking was validated with the carrier.',
            {
                type: 'seller_order_shipped',
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                carrier: updatedOrder.shippingCarrier || carrier,
                trackingNumber: updatedOrder.trackingNumber || trackingNumber,
                shippingProvider: updatedOrder.shippingProvider || shippingProvider,
            },
        );
        console.log('Notification sent to buyer for order shipped:', updatedOrder.trackingNumber || trackingNumber);
        return {
            message: trackerResult.skipped
                ? 'Order marked as shipped successfully (manual — EasyPost not configured)'
                : 'Order marked as shipped successfully (tracking validated via EasyPost)',
            orderId: updatedOrder.id,
            orderStatus: updatedOrder.orderStatus,
            shippingCarrier: updatedOrder.shippingCarrier,
            trackingNumber: updatedOrder.trackingNumber,
            shippingStatus: updatedOrder.shippingStatus,
            shippingProvider: updatedOrder.shippingProvider,
            easypostTrackerId: updatedOrder.easypostTrackerId,
            trackingValidatedAt: updatedOrder.trackingValidatedAt,
            easypostConfigured: this.shippingService.isConfigured(),

        };
    }

    async markOrderDelivered(userId: string | undefined, orderId: string, otp: string) {
        const sellerId = this.assertSellerUserId(userId);
        const order = await this.getOwnedOrderOrThrow(sellerId, orderId);

        this.ensureTransition(order.orderStatus, OrderStatus.PROCESSING, OrderStatus.DELIVERED);

        if (!order.deliveryOtp || !order.deliveryOtpExpiresAt) {
            throw new BadRequestException('Delivery OTP not found. Please send OTP first.');
        }

        if (order.deliveryOtpExpiresAt < new Date()) {
            throw new BadRequestException('Delivery OTP expired. Please send a new OTP.');
        }

        if (order.deliveryOtp !== otp) {
            throw new BadRequestException('Invalid delivery OTP');
        }

        // Manual deliver kept as fallback even when EasyPost is enabled.
        const updatedOrder = await this.prisma.order.update({
            where: { id: order.id },
            data: {
                orderStatus: OrderStatus.DELIVERED,
                shippingStatus: ShippingStatus.DELIVERED,
                shippingProvider: order.shippingProvider || 'MANUAL',
                deliveredAt: new Date(),
                deliveryOtp: null,
                deliveryOtpExpiresAt: null,
                deliveryOtpSentAt: null,
            },
            select: { id: true, orderStatus: true, buyerId: true, orderNumber: true, shippingStatus: true },
        });

        const payoutSchedule = await this.orderPayoutService.scheduleProtectionWindow(updatedOrder.id);

        const protectionEndsAtIso =
            payoutSchedule.protectionEndsAt instanceof Date
                ? payoutSchedule.protectionEndsAt.toISOString()
                : payoutSchedule.protectionEndsAt || undefined;

        await this.notificationService.sendNotificationToUser(
            updatedOrder.buyerId,
            'Order Delivered',
            protectionEndsAtIso
                ? 'Order delivered successfully. Confirm receipt or report a problem within 48 hours.'
                : 'Order delivered successfully.',
            {
                type: 'seller_order_delivered',
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                ...(protectionEndsAtIso ? { protectionEndsAt: protectionEndsAtIso } : {}),
            },
        );

        return {
            message: payoutSchedule.skipped
                ? 'Order marked as delivered successfully (manual)'
                : 'Order marked as delivered successfully (manual). Seller payout scheduled after buyer protection window.',
            orderId: updatedOrder.id,
            orderStatus: updatedOrder.orderStatus,
            shippingStatus: updatedOrder.shippingStatus,
            transferStatus: payoutSchedule.transferStatus,
            protectionEndsAt: payoutSchedule.protectionEndsAt,
            deliverySource: 'MANUAL',
        };
    }
}
