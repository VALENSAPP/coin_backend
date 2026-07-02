import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardItemsQueryDto } from './dto/dashboard-items-query.dto';
import { DashboardPaginationDto } from './dto/dashboard-pagination.dto';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    private assertUserId(userId?: string): string {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        return userId;
    }

    private async getSellerClosetOrThrow(userId: string) {
        const closet = await this.prisma.mycloset.findUnique({
            where: { userId },
            select: { id: true, userId: true },
        });

        if (!closet) {
            throw new NotFoundException('Seller closet not found');
        }

        return closet;
    }

    private async getClosetViewsTotal(closetId: string): Promise<number> {
        return this.prisma.closetView.count({
            where: { closetId },
        });
    }

    async getOverview(userId?: string) {
        const sellerId = this.assertUserId(userId);
        const closet = await this.getSellerClosetOrThrow(sellerId);

        const [totalItems, totalOrders, revenueAggregate, soldAggregate, views] = await Promise.all([
            this.prisma.closetItems.count({ where: { closetId: closet.id } }),
            this.prisma.order.count({ where: { sellerId } }),
            this.prisma.order.aggregate({
                where: {
                    sellerId,
                    paymentStatus: PaymentStatus.PAID,
                },
                _sum: { total: true },
            }),
            this.prisma.orderItem.aggregate({
                where: {
                    order: {
                        sellerId,
                    },
                },
                _sum: { quantity: true },
            }),
            this.getClosetViewsTotal(closet.id),
        ]);

        return {
            totalItems,
            orders: totalOrders,
            revenue: Number(revenueAggregate._sum.total || 0),
            sold: Number(soldAggregate._sum.quantity || 0),
            views,
        };
    }

    async getRecentOrders(userId?: string, query?: DashboardPaginationDto) {
        const sellerId = this.assertUserId(userId);
        await this.getSellerClosetOrThrow(sellerId);

        const page = query?.page ?? 1;
        const limit = query?.limit ?? 10;
        const skip = (page - 1) * limit;

        const where: Prisma.OrderWhereInput = { sellerId };

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
                total: order.total,
                orderStatus: order.orderStatus,
                createdAt: order.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getClosetItems(userId?: string, query?: DashboardItemsQueryDto) {
        const sellerId = this.assertUserId(userId);
        const closet = await this.getSellerClosetOrThrow(sellerId);

        const page = query?.page ?? 1;
        const limit = query?.limit ?? 10;
        const skip = (page - 1) * limit;

        const where: Prisma.ClosetItemsWhereInput = {
            closetId: closet.id,
            ...(query?.category ? { category: query.category } : {}),
            ...(typeof query?.isActive === 'boolean' ? { isActive: query.isActive } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.closetItems.count({ where }),
            this.prisma.closetItems.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    quantity: true,
                    soldCount: true,
                    isActive: true,
                    category: true,
                    createdAt: true,
                },
            }),
        ]);

        return {
            data: items.map((item) => ({
                id: item.id,
                productName: item.name,
                images: item.images,
                price: item.price,
                availableQuantity: item.quantity,
                soldCount: item.soldCount,
                views: 0,
                isActive: item.isActive,
                category: item.category,
                createdAt: item.createdAt,
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
