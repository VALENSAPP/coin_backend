import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EarningsHistoryQueryDto } from './dto/earnings-history-query.dto';

@Injectable()
export class EarningsService {
    constructor(private readonly prisma: PrismaService) { }

    private assertUserId(userId?: string): string {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        return userId;
    }

    private getPaidOrderWhere(sellerId: string): Prisma.OrderWhereInput {
        return {
            sellerId,
            paymentStatus: PaymentStatus.PAID,
        };
    }

    async getSummary(userId?: string) {
        const sellerId = this.assertUserId(userId);
        const where = this.getPaidOrderWhere(sellerId);

        const [paidOrders, sums] = await this.prisma.$transaction([
            this.prisma.order.count({ where }),
            this.prisma.order.aggregate({
                where,
                _sum: {
                    total: true,
                    serviceFee: true,
                    shippingCost: true,
                },
            }),
        ]);

        const totalRevenue = Number(sums._sum.total || 0);
        const platformFee = Number(sums._sum.serviceFee || 0);
        const shippingCollected = Number(sums._sum.shippingCost || 0);
        const netEarnings = totalRevenue - platformFee;

        return {
            totalRevenue,
            platformFee,
            shippingCollected,
            netEarnings,
            paidOrders,
        };
    }

    async getHistory(userId?: string, query?: EarningsHistoryQueryDto) {
        const sellerId = this.assertUserId(userId);
        const page = query?.page ?? 1;
        const limit = query?.limit ?? 10;
        const skip = (page - 1) * limit;

        const where = this.getPaidOrderWhere(sellerId);

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
                    createdAt: true,
                    total: true,
                    shippingCost: true,
                    serviceFee: true,
                    paymentStatus: true,
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
            data: orders.map((order) => ({
                id: order.id,
                orderNumber: order.orderNumber,
                buyerId: order.buyer.id,
                buyerName: order.buyer.displayName || order.buyer.userName || 'Unknown Buyer',
                paymentDate: order.createdAt,
                totalAmountPaid: order.total,
                shippingAmount: order.shippingCost,
                platformFee: order.serviceFee,
                netEarnings: Number(order.total - order.serviceFee),
                paymentStatus: order.paymentStatus,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
