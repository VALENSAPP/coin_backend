import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { OrderStatus, Prisma, ShippingStatus, TransferStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderPayoutService } from '../order/order-payout.service';

// @easypost/api is CommonJS (module.exports). Default ESM import breaks under Nest ("X.default is not a constructor").
// eslint-disable-next-line @typescript-eslint/no-var-requires
const EasyPostApi = require('@easypost/api');
const EasyPostClient = (EasyPostApi?.default ?? EasyPostApi) as new (apiKey: string) => {
    Tracker: {
        create: (params: { tracking_code: string; carrier?: string }) => Promise<{
            id: string;
            status?: string;
            tracking_code?: string;
            carrier?: string;
            [key: string]: unknown;
        }>;
    };
};

export type EasyPostTrackerResult = {
    configured: boolean;
    skipped: boolean;
    trackerId?: string;
    status?: string;
    shippingStatus: ShippingStatus;
    trackingValidatedAt?: Date;
    raw?: Record<string, unknown>;
};

const EASYPOST_TEST_TRACKING_CODES = new Set([
    'EZ1000000001',
    'EZ2000000002',
    'EZ3000000003',
    'EZ4000000004',
    'EZ5000000005',
    'EZ6000000006',
    'EZ7000000007',
]);

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);
    private readonly client: InstanceType<typeof EasyPostClient> | null;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => OrderPayoutService))
        private readonly orderPayoutService: OrderPayoutService,
        private readonly notificationService: NotificationService,
    ) {
        const apiKey = (process.env.EASYPOST_API_KEY || '').trim();
        this.client = apiKey ? new EasyPostClient(apiKey) : null;
        if (!this.client) {
            this.logger.warn(
                'EASYPOST_API_KEY is not set — EasyPost tracking disabled; manual ship/deliver remains available',
            );
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Create an EasyPost Tracker for seller-entered tracking.
     * When API key is missing, returns skipped=true so manual shipping can proceed.
     */
    async createTrackerForOrder(params: {
        orderId: string;
        carrier: string;
        trackingNumber: string;
    }): Promise<EasyPostTrackerResult> {
        const trackingNumber = params.trackingNumber.trim();
        const carrier = params.carrier.trim();

        await this.assertTrackingNotReused(trackingNumber, params.orderId);

        if (!this.client) {
            return {
                configured: false,
                skipped: true,
                shippingStatus: ShippingStatus.TRACKING_SUBMITTED,
            };
        }

        try {
            const tracker = await this.client.Tracker.create({
                tracking_code: trackingNumber,
                carrier: this.normalizeCarrier(carrier),
            });

            const shippingStatus = this.mapEasyPostStatus(tracker.status);
            const now = new Date();

            return {
                configured: true,
                skipped: false,
                trackerId: tracker.id,
                status: tracker.status,
                shippingStatus,
                trackingValidatedAt: now,
                raw: tracker as unknown as Record<string, unknown>,
            };
        } catch (error: any) {
            const message =
                error?.error?.error?.message ||
                error?.message ||
                'Unable to validate tracking with EasyPost';
            this.logger.warn(`EasyPost tracker create failed for order ${params.orderId}: ${message}`);
            throw new BadRequestException(
                `Tracking validation failed: ${message}. Check carrier and tracking number, or use a valid tracking code.`,
            );
        }
    }

    /**
     * Handle EasyPost tracker.updated webhook. Manual deliver path remains available.
     */
    async handleEasyPostWebhook(rawBody: Buffer, signatureHeader?: string) {
        this.verifyWebhookSignature(rawBody, signatureHeader);

        let event: any;
        try {
            event = JSON.parse(rawBody.toString('utf8'));
        } catch {
            throw new BadRequestException('Invalid EasyPost webhook JSON');
        }

        const description = String(event?.description || '');
        if (description !== 'tracker.updated' && event?.result?.object !== 'Tracker') {
            return { handled: false, reason: `Ignored event: ${description || 'unknown'}` };
        }

        const tracker = event?.result;
        if (!tracker?.id && !tracker?.tracking_code) {
            throw new BadRequestException('Webhook missing tracker payload');
        }

        const shippingStatus = this.mapEasyPostStatus(tracker.status);
        const order = await this.findOrderForTracker(tracker);

        if (!order) {
            this.logger.warn(
                `No order found for EasyPost tracker ${tracker.id || tracker.tracking_code}`,
            );
            return { handled: false, reason: 'Order not found for tracker' };
        }

        const updateData: Prisma.OrderUpdateInput = {
            shippingStatus,
            shippingProvider: 'EASYPOST',
            easypostTrackerId: tracker.id || order.easypostTrackerId,
            lastTrackingPayload: tracker as Prisma.InputJsonValue,
            shippingCarrier: tracker.carrier || order.shippingCarrier,
            trackingNumber: tracker.tracking_code || order.trackingNumber,
        };

        if (!order.trackingValidatedAt && shippingStatus !== ShippingStatus.TRACKING_SUBMITTED) {
            updateData.trackingValidatedAt = new Date();
        }

        const shipAdvanceStatuses: ShippingStatus[] = [
            ShippingStatus.TRACKING_VALIDATED,
            ShippingStatus.PRE_TRANSIT,
            ShippingStatus.IN_TRANSIT,
            ShippingStatus.OUT_FOR_DELIVERY,
            ShippingStatus.DELIVERED,
        ];

        if (
            order.orderStatus === OrderStatus.PROCESSING &&
            shipAdvanceStatuses.includes(shippingStatus)
        ) {
            updateData.orderStatus = OrderStatus.SHIPPED;
        }

        let shouldScheduleProtection = false;

        if (shippingStatus === ShippingStatus.DELIVERED) {
            updateData.carrierDeliveredAt = tracker.updated_at
                ? new Date(tracker.updated_at)
                : new Date();
            if (order.orderStatus === OrderStatus.SHIPPED || order.orderStatus === OrderStatus.PROCESSING) {
                updateData.orderStatus = OrderStatus.DELIVERED;
                shouldScheduleProtection = true;
            } else if (
                order.orderStatus === OrderStatus.DELIVERED &&
                (order.transferStatus === TransferStatus.PENDING || !order.protectionEndsAt)
            ) {
                shouldScheduleProtection = true;
            }
        }

        if (
            shippingStatus === ShippingStatus.DELIVERY_EXCEPTION ||
            shippingStatus === ShippingStatus.RETURNING_TO_SELLER ||
            shippingStatus === ShippingStatus.RETURNED
        ) {
            if (
                order.transferStatus === TransferStatus.PENDING ||
                order.transferStatus === TransferStatus.SCHEDULED
            ) {
                updateData.transferStatus = TransferStatus.FROZEN;
            }
        }

        const updated = await this.prisma.order.update({
            where: { id: order.id },
            data: updateData,
            select: {
                id: true,
                orderNumber: true,
                buyerId: true,
                sellerId: true,
                orderStatus: true,
                shippingStatus: true,
                transferStatus: true,
            },
        });

        if (shouldScheduleProtection && updated.orderStatus === OrderStatus.DELIVERED) {
            const payout = await this.orderPayoutService.scheduleProtectionWindow(updated.id);

            await this.notificationService.sendNotificationToUser(
                updated.buyerId,
                'Order Delivered',
                'Carrier confirmed delivery. Confirm receipt or report a problem within 48 hours.',
                {
                    type: 'carrier_order_delivered',
                    orderId: updated.id,
                    orderNumber: updated.orderNumber,
                    protectionEndsAt:
                        payout.protectionEndsAt instanceof Date
                            ? payout.protectionEndsAt.toISOString()
                            : '',
                },
            );

            return {
                handled: true,
                orderId: updated.id,
                shippingStatus: updated.shippingStatus,
                orderStatus: updated.orderStatus,
                payoutScheduled: !payout.skipped,
                protectionEndsAt: payout.protectionEndsAt,
            };
        }

        if (
            shippingStatus === ShippingStatus.DELIVERY_EXCEPTION ||
            shippingStatus === ShippingStatus.RETURNING_TO_SELLER
        ) {
            await this.notificationService.sendNotificationToUser(
                updated.sellerId,
                'Delivery Exception',
                'Carrier reported a delivery problem. Payout may be on hold.',
                {
                    type: 'carrier_delivery_exception',
                    orderId: updated.id,
                    orderNumber: updated.orderNumber,
                    shippingStatus: String(updated.shippingStatus),
                },
            );
        }

        return {
            handled: true,
            orderId: updated.id,
            shippingStatus: updated.shippingStatus,
            orderStatus: updated.orderStatus,
        };
    }

    mapEasyPostStatus(status?: string | null): ShippingStatus {
        const normalized = (status || '').trim().toLowerCase();
        switch (normalized) {
            case 'pre_transit':
                return ShippingStatus.PRE_TRANSIT;
            case 'in_transit':
                return ShippingStatus.IN_TRANSIT;
            case 'out_for_delivery':
                return ShippingStatus.OUT_FOR_DELIVERY;
            case 'delivered':
                return ShippingStatus.DELIVERED;
            case 'available_for_pickup':
                return ShippingStatus.AVAILABLE_FOR_PICKUP;
            case 'return_to_sender':
                return ShippingStatus.RETURNING_TO_SELLER;
            case 'failure':
            case 'error':
                return ShippingStatus.DELIVERY_EXCEPTION;
            case 'cancelled':
                return ShippingStatus.CANCELLED;
            case 'unknown':
                return ShippingStatus.UNKNOWN;
            default:
                return ShippingStatus.TRACKING_VALIDATED;
        }
    }

    private normalizeCarrier(carrier: string): string {
        const key = carrier.trim().toLowerCase().replace(/\s+/g, '');
        const map: Record<string, string> = {
            usps: 'USPS',
            ups: 'UPS',
            fedex: 'FedEx',
            dhl: 'DHLExpress',
            dhlexpress: 'DHLExpress',
            dhlecommerce: 'DhlEcs',
            correios: 'CorreiosBrazil',
            canada: 'CanadaPost',
            canadapost: 'CanadaPost',
            royalmail: 'RoyalMail',
        };
        return map[key] || carrier.trim();
    }

    private async assertTrackingNotReused(trackingNumber: string, orderId: string) {
        if (EASYPOST_TEST_TRACKING_CODES.has(trackingNumber.toUpperCase())) {
            return;
        }

        const existing = await this.prisma.order.findFirst({
            where: {
                trackingNumber,
                id: { not: orderId },
                orderStatus: { not: OrderStatus.CANCELLED },
            },
            select: { id: true, orderNumber: true },
        });
        if (existing) {
            throw new BadRequestException(
                `Tracking number already used on order ${existing.orderNumber}`,
            );
        }
    }

    private async findOrderForTracker(tracker: any) {
        if (tracker?.id) {
            const byTracker = await this.prisma.order.findFirst({
                where: { easypostTrackerId: tracker.id },
            });
            if (byTracker) return byTracker;
        }

        if (tracker?.tracking_code) {
            return this.prisma.order.findFirst({
                where: {
                    trackingNumber: String(tracker.tracking_code),
                    orderStatus: { not: OrderStatus.CANCELLED },
                },
                orderBy: { createdAt: 'desc' },
            });
        }

        return null;
    }

    private verifyWebhookSignature(rawBody: Buffer, signatureHeader?: string) {
        const secret = (process.env.EASYPOST_WEBHOOK_SECRET || '').trim();
        if (!secret) {
            this.logger.warn('EASYPOST_WEBHOOK_SECRET not set; skipping webhook signature verification');
            return;
        }

        if (!signatureHeader) {
            throw new BadRequestException('Missing EasyPost webhook signature');
        }

        const provided = signatureHeader.includes('=')
            ? signatureHeader.split('=').pop()!.trim()
            : signatureHeader.trim();

        const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

        const a = Buffer.from(provided, 'utf8');
        const b = Buffer.from(expected, 'utf8');
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            throw new BadRequestException('Invalid EasyPost webhook signature');
        }
    }
}
