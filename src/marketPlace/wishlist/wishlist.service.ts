import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';

@Injectable()
export class WishlistService {
    constructor(private readonly prisma: PrismaService) { }

    private roundMoney(amount: number) {
        return Number(amount.toFixed(2));
    }

    private async ensureUserExists(userId: string) {
        if (!userId) throw new BadRequestException('User ID required');

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) throw new NotFoundException('User not found');
    }

    private async getOrCreateWishlist(userId: string, sellerId: string, closetId: string) {
        const existingWishlist = await this.prisma.wishlist.findFirst({
            where: { userId, sellerId, closetId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, userId: true, sellerId: true, closetId: true },
        });

        if (existingWishlist) return existingWishlist;

        return this.prisma.wishlist.create({
            data: { userId, sellerId, closetId },
            select: { id: true, userId: true, sellerId: true, closetId: true },
        });
    }

    async addItem(userId: string, dto: AddWishlistItemDto) {
        await this.ensureUserExists(userId);

        const product = await this.prisma.closetItems.findUnique({
            where: { id: dto.productId },
            select: {
                id: true,
                userId: true,
                closetId: true,
                isActive: true,
                isDeleted: true,
            },
        });

        if (!product || !product.isActive || product.isDeleted) {
            throw new NotFoundException('Product not found');
        }

        if (product.userId === userId) {
            throw new BadRequestException('You cannot add your own product to wishlist');
        }

        const wishlist = await this.getOrCreateWishlist(userId, product.userId, product.closetId);

        const existingItem = await this.prisma.wishlistItems.findUnique({
            where: {
                wishlistId_productId: {
                    wishlistId: wishlist.id,
                    productId: product.id,
                },
            },
            select: { id: true },
        });

        if (!existingItem) {
            await this.prisma.wishlistItems.create({
                data: {
                    wishlistId: wishlist.id,
                    productId: product.id,
                },
            });
        }

        return this.getWishlist(userId);
    }

    async getWishlist(userId: string, sellerId?: string) {
        await this.ensureUserExists(userId);

        const wishlists = await this.prisma.wishlist.findMany({
            where: {
                userId,
                ...(sellerId ? { sellerId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                wishlistItems: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                                brand: true,
                                images: true,
                                price: true,
                                quantity: true,
                                shippingOption: true,
                                shippingFee: true,
                                isActive: true,
                                isDeleted: true,
                            },
                        },
                    },
                },
            },
        });

        if (!wishlists.length) {
            return {
                wishlists: [],
                totals: {
                    totalItems: 0,
                    estimatedAmount: 0,
                    totalWishlists: 0,
                },
            };
        }

        const wishlistGroups = wishlists
            .map((wishlist) => {
                const activeItems = wishlist.wishlistItems.filter(
                    (item) => item.product && item.product.isActive && !item.product.isDeleted,
                );

                const groupEstimatedAmount = this.roundMoney(
                    activeItems.reduce((sum, item) => sum + (item.product?.price ?? 0), 0),
                );

                return {
                    ...wishlist,
                    wishlistItems: activeItems,
                    totals: {
                        totalItems: activeItems.length,
                        estimatedAmount: groupEstimatedAmount,
                    },
                };
            })
            .filter((wishlist) => wishlist.wishlistItems.length > 0);

        const totalItems = wishlistGroups.reduce((sum, wishlist) => sum + wishlist.wishlistItems.length, 0);
        const estimatedAmount = this.roundMoney(
            wishlistGroups.reduce(
                (sum, wishlist) =>
                    sum + wishlist.wishlistItems.reduce((itemSum, item) => itemSum + (item.product?.price ?? 0), 0),
                0,
            ),
        );

        return {
            wishlists: wishlistGroups,
            totals: {
                totalItems,
                estimatedAmount,
                totalWishlists: wishlistGroups.length,
            },
        };
    }

    async removeItem(userId: string, wishlistItemId: string) {
        await this.ensureUserExists(userId);
        if (!wishlistItemId) throw new BadRequestException('Wishlist item ID required');

        const wishlistItem = await this.prisma.wishlistItems.findUnique({
            where: { id: wishlistItemId },
            include: {
                wishlist: {
                    select: { userId: true },
                },
            },
        });

        if (!wishlistItem || wishlistItem.wishlist.userId !== userId) {
            throw new NotFoundException('Wishlist item not found');
        }

        await this.prisma.wishlistItems.delete({
            where: { id: wishlistItem.id },
        });

        return this.getWishlist(userId);
    }

    async deleteWishlist(userId: string) {
        await this.ensureUserExists(userId);

        const wishlists = await this.prisma.wishlist.findMany({
            where: { userId },
            select: { id: true },
        });

        if (!wishlists.length) {
            return { message: 'Wishlist not found' };
        }

        const wishlistIds = wishlists.map((wishlist) => wishlist.id);

        await this.prisma.$transaction([
            this.prisma.wishlistItems.deleteMany({
                where: { wishlistId: { in: wishlistIds } },
            }),
            this.prisma.wishlist.deleteMany({
                where: { id: { in: wishlistIds } },
            }),
        ]);

        return { message: 'Wishlist deleted successfully' };
    }
}
