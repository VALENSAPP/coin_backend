import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PaymentStatus, Prisma, TransferStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EarningsHistoryQueryDto } from './dto/earnings-history-query.dto';

@Injectable()
export class EarningsService {
    constructor(private readonly prisma: PrismaService) { }

    private assertUserId(userId?: string): string {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        return userId;
    }

    /** Only count orders whose escrow payout has been transferred to the seller. */
    private getReleasedOrderWhere(sellerId: string): Prisma.OrderWhereInput {
        return {
            sellerId,
            paymentStatus: PaymentStatus.PAID,
            transferStatus: TransferStatus.RELEASED,
        };
    }

    async getSummary(userId?: string) {
        const sellerId = this.assertUserId(userId);
        const where = this.getReleasedOrderWhere(sellerId);

        const [paidOrders, sums] = await this.prisma.$transaction([
            this.prisma.order.count({ where }),
            this.prisma.order.aggregate({
                where,
                _sum: {
                    total: true,
                    serviceFee: true,
                    shippingCost: true,
                    sellerAmountMinor: true,
                    platformFeeMinor: true,
                },
            }),
        ]);

        const totalRevenue = Number(sums._sum.total || 0);
        const platformFee =
            sums._sum.platformFeeMinor != null
                ? Number(sums._sum.platformFeeMinor) / 100
                : Number(sums._sum.serviceFee || 0);
        const shippingCollected = Number(sums._sum.shippingCost || 0);
        const netEarnings =
            sums._sum.sellerAmountMinor != null
                ? Number(sums._sum.sellerAmountMinor) / 100
                : totalRevenue - platformFee;

        return {
            totalRevenue,
            platformFee,
            shippingCollected,
            netEarnings,
            paidOrders,
            note: 'Earnings include only orders with released Stripe transfers (after delivery + protection window).',
        };
    }

    async getHistory(userId?: string, query?: EarningsHistoryQueryDto) {
        const sellerId = this.assertUserId(userId);
        const page = query?.page ?? 1;
        const limit = query?.limit ?? 10;
        const skip = (page - 1) * limit;

        const where = this.getReleasedOrderWhere(sellerId);

        const [total, orders] = await this.prisma.$transaction([
            this.prisma.order.count({ where }),
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { payoutReleasedAt: 'desc' },
                select: {
                    id: true,
                    orderNumber: true,
                    createdAt: true,
                    payoutReleasedAt: true,
                    total: true,
                    shippingCost: true,
                    serviceFee: true,
                    platformFeeMinor: true,
                    sellerAmountMinor: true,
                    paymentStatus: true,
                    transferStatus: true,
                    stripeTransferId: true,
                    buyer: {
                        select: {
                            id: true,
                            displayName: true,
                            userName: true,
                        },
                    },
                },
            }),
        ]);

        return {
            data: orders.map((order) => {
                const platformFee =
                    order.platformFeeMinor != null
                        ? order.platformFeeMinor / 100
                        : order.serviceFee;
                const netEarnings =
                    order.sellerAmountMinor != null
                        ? order.sellerAmountMinor / 100
                        : Number(order.total - platformFee);

                return {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    buyerId: order.buyer.id,
                    buyerName: order.buyer.displayName || order.buyer.userName || 'Unknown Buyer',
                    paymentDate: order.createdAt,
                    payoutReleasedAt: order.payoutReleasedAt,
                    totalAmountPaid: order.total,
                    shippingAmount: order.shippingCost,
                    platformFee,
                    netEarnings,
                    paymentStatus: order.paymentStatus,
                    transferStatus: order.transferStatus,
                    stripeTransferId: order.stripeTransferId,
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
}
