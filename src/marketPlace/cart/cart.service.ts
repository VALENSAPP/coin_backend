import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';

@Injectable()
export class CartService {
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

    private async getOrCreateCart(userId: string) {
        const existingCart = await this.prisma.cart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, userId: true },
        });

        if (existingCart) return existingCart;

        return this.prisma.cart.create({
            data: { userId },
            select: { id: true, userId: true },
        });
    }

    async addItem(userId: string, dto: AddCartItemDto) {
        await this.ensureUserExists(userId);

        const product = await this.prisma.closetItems.findUnique({
            where: { id: dto.productId },
            select: {
                id: true,
                userId: true,
                quantity: true,
                price: true,
                name: true,
            },
        });

        if (!product) throw new NotFoundException('Product not found');
        if (product.userId === userId) throw new BadRequestException('You cannot add your own product to cart');
        if (dto.quantity > product.quantity) {
            throw new BadRequestException('Requested quantity exceeds available stock');
        }

        const cart = await this.getOrCreateCart(userId);

        const existingItem = await this.prisma.cartItems.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: product.id,
                },
            },
            select: { id: true, quantity: true },
        });

        const nextQuantity = existingItem ? existingItem.quantity + dto.quantity : dto.quantity;
        if (nextQuantity > product.quantity) {
            throw new BadRequestException('Requested quantity exceeds available stock');
        }

        const subtotal = Number((nextQuantity * product.price).toFixed(2));

        if (existingItem) {
            await this.prisma.cartItems.update({
                where: { id: existingItem.id },
                data: {
                    quantity: nextQuantity,
                    price: product.price,
                    subtotal,
                },
            });
        } else {
            await this.prisma.cartItems.create({
                data: {
                    cartId: cart.id,
                    productId: product.id,
                    quantity: nextQuantity,
                    price: product.price,
                    subtotal,
                },
            });
        }

        return this.getCart(userId);
    }

    async getCart(userId: string) {
        await this.ensureUserExists(userId);

        const cart = await this.prisma.cart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                cartItems: {
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
                            },
                        },
                    },
                },
            },
        });

        if (!cart) {
            return {
                cart: null,
                totals: {
                    totalItems: 0,
                    totalAmount: 0,
                },
            };
        }

        const totalItems = cart.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = Number(cart.cartItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));

        return {
            cart,
            totals: {
                totalItems,
                totalAmount,
            },
        };
    }

    async updateQuantity(userId: string, cartItemId: string, dto: UpdateCartItemQuantityDto) {
        await this.ensureUserExists(userId);
        if (!cartItemId) throw new BadRequestException('Cart item ID required');

        const cartItem = await this.prisma.cartItems.findUnique({
            where: { id: cartItemId },
            include: {
                cart: {
                    select: { id: true, userId: true },
                },
            },
        });

        if (!cartItem || cartItem.cart.userId !== userId) {
            throw new NotFoundException('Cart item not found');
        }

        const product = await this.prisma.closetItems.findUnique({
            where: { id: cartItem.productId },
            select: { id: true, quantity: true, price: true },
        });

        if (!product) throw new NotFoundException('Product not found');
        if (dto.quantity > product.quantity) {
            throw new BadRequestException('Requested quantity exceeds available stock');
        }

        const subtotal = Number((dto.quantity * product.price).toFixed(2));

        await this.prisma.cartItems.update({
            where: { id: cartItem.id },
            data: {
                quantity: dto.quantity,
                price: product.price,
                subtotal,
            },
        });

        return this.getCart(userId);
    }

    async removeItem(userId: string, cartItemId: string) {
        await this.ensureUserExists(userId);
        if (!cartItemId) throw new BadRequestException('Cart item ID required');

        const cartItem = await this.prisma.cartItems.findUnique({
            where: { id: cartItemId },
            include: {
                cart: {
                    select: { userId: true },
                },
            },
        });

        if (!cartItem || cartItem.cart.userId !== userId) {
            throw new NotFoundException('Cart item not found');
        }

        await this.prisma.cartItems.delete({
            where: { id: cartItem.id },
        });

        return this.getCart(userId);
    }

    async deleteCart(userId: string) {
        await this.ensureUserExists(userId);

        const carts = await this.prisma.cart.findMany({
            where: { userId },
            select: { id: true },
        });

        if (!carts.length) {
            return { message: 'Cart not found' };
        }

        const cartIds = carts.map((cart) => cart.id);

        await this.prisma.$transaction([
            this.prisma.cartItems.deleteMany({
                where: { cartId: { in: cartIds } },
            }),
            this.prisma.cart.deleteMany({
                where: { id: { in: cartIds } },
            }),
        ]);

        return { message: 'Cart deleted successfully' };
    }

    async inspectCheckout(userId: string) {
        await this.ensureUserExists(userId);

        const cart = await this.prisma.cart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                cartItems: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        product: {
                            select: {
                                id: true,
                                userId: true,
                                name: true,
                                price: true,
                                quantity: true,
                                shippingOption: true,
                            },
                        },
                    },
                },
            },
        });

        if (!cart || !cart.cartItems.length) {
            throw new BadRequestException('Cart is empty');
        }

        const items: Array<{
            cartItemId: string;
            productId: string;
            productName: string;
            requestedQuantity: number;
            approvedQuantity: number;
            unitPrice: number;
            lineTotal: number;
            shippingOption: string;
        }> = [];

        const issues: Array<{
            cartItemId: string;
            productId: string;
            code: string;
            message: string;
        }> = [];

        const warnings: Array<{
            cartItemId: string;
            productId: string;
            code: string;
            message: string;
        }> = [];

        let itemsSubtotal = 0;
        let totalItems = 0;

        for (const cartItem of cart.cartItems) {
            const product = cartItem.product;

            if (!product) {
                issues.push({
                    cartItemId: cartItem.id,
                    productId: cartItem.productId,
                    code: 'PRODUCT_NOT_FOUND',
                    message: 'This product is no longer available.',
                });
                continue;
            }

            if (product.userId === userId) {
                issues.push({
                    cartItemId: cartItem.id,
                    productId: product.id,
                    code: 'SELF_PURCHASE_NOT_ALLOWED',
                    message: 'You cannot purchase your own product.',
                });
                continue;
            }

            if (product.quantity <= 0) {
                issues.push({
                    cartItemId: cartItem.id,
                    productId: product.id,
                    code: 'OUT_OF_STOCK',
                    message: 'This product is out of stock.',
                });
                continue;
            }

            if (cartItem.quantity > product.quantity) {
                issues.push({
                    cartItemId: cartItem.id,
                    productId: product.id,
                    code: 'INSUFFICIENT_STOCK',
                    message: `Requested quantity (${cartItem.quantity}) exceeds available stock (${product.quantity}).`,
                });
                continue;
            }

            if (Math.abs(cartItem.price - product.price) > 0.000001) {
                warnings.push({
                    cartItemId: cartItem.id,
                    productId: product.id,
                    code: 'PRICE_UPDATED',
                    message: `Price changed from ${cartItem.price} to ${product.price}. Latest price applied.`,
                });
            }

            const unitPrice = this.roundMoney(product.price);
            const lineTotal = this.roundMoney(unitPrice * cartItem.quantity);

            items.push({
                cartItemId: cartItem.id,
                productId: product.id,
                productName: product.name,
                requestedQuantity: cartItem.quantity,
                approvedQuantity: cartItem.quantity,
                unitPrice,
                lineTotal,
                shippingOption: product.shippingOption,
            });

            totalItems += cartItem.quantity;
            itemsSubtotal = this.roundMoney(itemsSubtotal + lineTotal);
        }

        if (!items.length) {
            throw new BadRequestException({
                message: 'Checkout is not possible. Please update your cart.',
                issues,
            });
        }

        // Shipping/tax/fees are intentionally set to 0 until dedicated pricing rules are configured.
        const shippingAmount = 0;
        const taxAmount = 0;
        const platformFee = 0;
        const discountAmount = 0;
        const totalAmountDue = this.roundMoney(
            itemsSubtotal + shippingAmount + taxAmount + platformFee - discountAmount,
        );

        return {
            checkout: {
                isValid: issues.length === 0,
                currency: 'USD',
                checkedAt: new Date().toISOString(),
                totalItems,
                items,
                issues,
                warnings,
                breakdown: {
                    itemsSubtotal,
                    shippingAmount,
                    taxAmount,
                    platformFee,
                    discountAmount,
                    totalAmountDue,
                },
            },
        };
    }
}
