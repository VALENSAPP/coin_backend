import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma, ShippingOptions } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { CreateMarketplacePaymentDto } from './dto/create-marketplace-payment.dto';

@Injectable()
export class PaymentService {
    private readonly stripe: Stripe;
    private readonly provider = 'STRIPE';
    private readonly marketplaceType = 'marketplace_mycloset';

    constructor(
        private readonly prisma: PrismaService,
        private readonly orderService: OrderService,
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
            where: { id: dto.cartId, userId },
            include: {
                cartItems: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                userId: true,
                                closetId: true,
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

        const address = await this.prisma.userAddrees.findFirst({
            where: { id: dto.addressId, userId },
            select: { id: true },
        });
        if (!address) {
            throw new BadRequestException('Invalid shipping address');
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

            if (product.userId !== cart.sellerId || product.closetId !== cart.closetId) {
                throw new BadRequestException(
                    `Cart contains product not matching cart seller/closet: ${product.name}`,
                );
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
                    sellerId: cart.sellerId,
                    closetId: cart.closetId,
                    addressId: address.id,
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
                    sellerId: cart.sellerId,
                    closetId: cart.closetId,
                    addressId: address.id,
                },
                payment_intent_data: {
                    metadata: {
                        type: this.marketplaceType,
                        paymentId: payment.id,
                        userId,
                        cartId: cart.id,
                        sellerId: cart.sellerId,
                        closetId: cart.closetId,
                        addressId: address.id,
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
        await this.orderService.createOrderFromPaymentIntent(paymentIntent);
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

    async getPaymentDetailsById(userId: string, paymentId: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        if (!paymentId) throw new BadRequestException('paymentId is required');

        const payment = await this.prisma.marketPlacePayments.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.userId && payment.userId !== userId) {
            throw new UnauthorizedException('You are not allowed to access this payment');
        }

        return payment;
    }

    async getPaymentDetailsForUser(userId: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        return this.prisma.marketPlacePayments.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
