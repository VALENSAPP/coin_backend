import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DisputeStatus, OrderStatus, PaymentStatus, TransferStatus } from '@prisma/client';
import Stripe from 'stripe';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderPayoutService {
    private readonly logger = new Logger(OrderPayoutService.name);
    private readonly stripe: Stripe;
    /** Buyer protection window after delivery before auto-release. */
    readonly protectionWindowMs = 48 * 60 * 60 * 1000;

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2024-06-20',
        });
    }

    /**
     * Called when an order becomes DELIVERED.
     * Schedules seller payout after the buyer protection window.
     */
    async scheduleProtectionWindow(orderId: string) {
        const now = new Date();
        const protectionEndsAt = new Date(now.getTime() + this.protectionWindowMs);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                orderStatus: true,
                paymentStatus: true,
                transferStatus: true,
                disputeStatus: true,
                sellerAmountMinor: true,
                sellerStripeAccountId: true,
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.orderStatus !== OrderStatus.DELIVERED) {
            throw new BadRequestException('Protection window can only start after delivery');
        }
        if (order.paymentStatus !== PaymentStatus.PAID) {
            throw new BadRequestException('Order payment is not in a payable state');
        }
        if (order.transferStatus === TransferStatus.RELEASED) {
            return { message: 'Payout already released', orderId, transferStatus: order.transferStatus, skipped: false };
        }
        if (order.transferStatus === TransferStatus.FROZEN || order.disputeStatus === DisputeStatus.OPEN) {
            return { message: 'Payout is frozen due to dispute', orderId, transferStatus: order.transferStatus, skipped: true };
        }
        if (!order.sellerAmountMinor || order.sellerAmountMinor <= 0 || !order.sellerStripeAccountId) {
            this.logger.warn(
                `Order ${orderId} missing escrow payout fields; skipping protection schedule (legacy/non-escrow order)`,
            );
            return {
                message: 'Order delivered without escrow schedule (missing payout fields)',
                orderId,
                transferStatus: order.transferStatus,
                protectionEndsAt: null as Date | null,
                deliveredAt: null as Date | null,
                skipped: true,
            };
        }

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                deliveredAt: now,
                protectionEndsAt,
                transferStatus: TransferStatus.SCHEDULED,
            },
            select: {
                id: true,
                transferStatus: true,
                protectionEndsAt: true,
                deliveredAt: true,
                buyerId: true,
                sellerId: true,
                orderNumber: true,
            },
        });

        await this.notificationService.sendNotificationToUser(
            updated.buyerId,
            'Confirm your delivery',
            'Your order was marked delivered.',
            {
                type: 'marketplace_delivery_protection_started',
                orderId: updated.id,
                orderNumber: updated.orderNumber,
                protectionEndsAt: updated.protectionEndsAt?.toISOString() || '',
            },
        );

        await this.notificationService.sendNotificationToUser(
            updated.sellerId,
            'Delivered – Payment Pending',
            'Buyer has 48 hours to confirm. Your payout will release after the protection window.',
            {
                type: 'marketplace_payout_scheduled',
                orderId: updated.id,
                orderNumber: updated.orderNumber,
                protectionEndsAt: updated.protectionEndsAt?.toISOString() || '',
            },
        );

        return {
            message: 'Buyer protection window started',
            orderId: updated.id,
            transferStatus: updated.transferStatus,
            protectionEndsAt: updated.protectionEndsAt,
            deliveredAt: updated.deliveredAt,
            skipped: false,
        };
    }

    /**
     * Creates a Stripe Connect transfer to the seller when all release conditions are met.
     * Idempotent via transferStatus guard + Stripe idempotency key.
     */
    async releaseIfEligible(orderId: string, options?: { skipProtectionCheck?: boolean }) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                payment: { select: { id: true, currency: true, paymentIntentId: true } },
                seller: { select: { id: true, stripeAccountId: true } },
            },
        });

        if (!order) throw new NotFoundException('Order not found');

        if (order.orderStatus !== OrderStatus.DELIVERED) {
            return { released: false, reason: 'Order is not delivered', orderId };
        }
        if (order.paymentStatus !== PaymentStatus.PAID) {
            return { released: false, reason: 'Payment is not PAID', orderId };
        }
        if (order.disputeStatus !== DisputeStatus.NONE) {
            return { released: false, reason: 'Dispute is open or unresolved', orderId };
        }
        if (order.transferStatus === TransferStatus.RELEASED) {
            return { released: false, reason: 'Already released', orderId, stripeTransferId: order.stripeTransferId };
        }
        if (order.transferStatus === TransferStatus.FROZEN) {
            return { released: false, reason: 'Payout is frozen', orderId };
        }
        if (
            order.transferStatus !== TransferStatus.SCHEDULED &&
            order.transferStatus !== TransferStatus.FAILED &&
            order.transferStatus !== TransferStatus.PENDING
        ) {
            return { released: false, reason: `Unexpected transfer status: ${order.transferStatus}`, orderId };
        }

        if (!options?.skipProtectionCheck) {
            if (!order.protectionEndsAt || order.protectionEndsAt.getTime() > Date.now()) {
                return { released: false, reason: 'Protection window has not expired', orderId };
            }
        }

        const sellerAmountMinor = order.sellerAmountMinor ?? 0;
        const destination = order.sellerStripeAccountId || order.seller.stripeAccountId;
        if (sellerAmountMinor <= 0 || !destination) {
            await this.prisma.order.update({
                where: { id: orderId },
                data: { transferStatus: TransferStatus.FAILED },
            });
            return { released: false, reason: 'Missing seller amount or Connect account', orderId };
        }

        const currency = (order.payment?.currency || 'usd').toLowerCase();
        const chargeId =
            order.stripeChargeId ||
            (order.payment?.paymentIntentId
                ? await this.resolveChargeId(order.payment.paymentIntentId)
                : null);

        try {
            const transferParams: Stripe.TransferCreateParams = {
                amount: sellerAmountMinor,
                currency,
                destination,
                transfer_group: order.paymentId || order.id,
                metadata: {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    paymentId: order.paymentId || '',
                    type: 'marketplace_mycloset_payout',
                },
            };

            if (chargeId) {
                transferParams.source_transaction = chargeId;
            }

            const transfer = await this.stripe.transfers.create(transferParams, {
                idempotencyKey: `marketplace-payout-${order.id}`,
            });

            const updated = await this.prisma.order.update({
                where: { id: order.id },
                data: {
                    transferStatus: TransferStatus.RELEASED,
                    stripeTransferId: transfer.id,
                    payoutReleasedAt: new Date(),
                    stripeChargeId: chargeId || order.stripeChargeId,
                    sellerStripeAccountId: destination,
                },
                select: {
                    id: true,
                    orderNumber: true,
                    sellerId: true,
                    buyerId: true,
                    stripeTransferId: true,
                    sellerAmountMinor: true,
                    transferStatus: true,
                    payoutReleasedAt: true,
                },
            });

            await this.notificationService.sendNotificationToUser(
                updated.sellerId,
                'Payment Released',
                'Your marketplace payout has been released.',
                {
                    type: 'marketplace_payout_released',
                    orderId: updated.id,
                    orderNumber: updated.orderNumber,
                    stripeTransferId: updated.stripeTransferId || '',
                    amountMinor: String(updated.sellerAmountMinor ?? 0),
                },
            );

            return {
                released: true,
                orderId: updated.id,
                stripeTransferId: updated.stripeTransferId,
                transferStatus: updated.transferStatus,
                payoutReleasedAt: updated.payoutReleasedAt,
            };
        } catch (error: any) {
            this.logger.error(
                `Failed to release payout for order ${orderId}: ${error?.message || error}`,
                error?.stack,
            );

            await this.prisma.order.update({
                where: { id: orderId },
                data: { transferStatus: TransferStatus.FAILED },
            });

            return {
                released: false,
                reason: error?.message || 'Stripe transfer failed',
                orderId,
            };
        }
    }

    async freezePayout(orderId: string, reason?: string) {
        const order = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                transferStatus: TransferStatus.FROZEN,
                disputeStatus: DisputeStatus.OPEN,
                disputeReason: reason?.trim() || 'Buyer reported a problem',
            },
            select: {
                id: true,
                orderNumber: true,
                sellerId: true,
                buyerId: true,
                transferStatus: true,
                disputeStatus: true,
            },
        });

        await this.notificationService.sendNotificationToUser(
            order.sellerId,
            'Payout Frozen',
            'A buyer reported a problem. Your payout is on hold.',
            {
                type: 'marketplace_payout_frozen',
                orderId: order.id,
                orderNumber: order.orderNumber,
            },
        );

        return order;
    }

    async processDuePayouts(limit = 50) {
        const dueOrders = await this.prisma.order.findMany({
            where: {
                orderStatus: OrderStatus.DELIVERED,
                paymentStatus: PaymentStatus.PAID,
                disputeStatus: DisputeStatus.NONE,
                transferStatus: { in: [TransferStatus.SCHEDULED, TransferStatus.FAILED] },
                protectionEndsAt: { lte: new Date() },
            },
            select: { id: true },
            take: limit,
            orderBy: { protectionEndsAt: 'asc' },
        });

        let released = 0;
        let failed = 0;
        let skipped = 0;

        for (const row of dueOrders) {
            const result = await this.releaseIfEligible(row.id);
            if (result.released) released += 1;
            else if (result.reason?.includes('Stripe') || result.reason?.includes('Missing')) failed += 1;
            else skipped += 1;
        }

        return { scanned: dueOrders.length, released, failed, skipped };
    }

    private async resolveChargeId(paymentIntentId: string): Promise<string | null> {
        try {
            const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return typeof pi.latest_charge === 'string' ? pi.latest_charge : null;
        } catch (error: any) {
            this.logger.warn(`Unable to resolve charge for PI ${paymentIntentId}: ${error?.message || error}`);
            return null;
        }
    }
}
