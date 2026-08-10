import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type MarketplacePaymentProvider = 'STRIPE' | 'PAGBANK';

@Injectable()
export class PaymentProviderResolver {
    constructor(private readonly prisma: PrismaService) { }

    // Reuses persisted user payment history to keep legacy Stripe users on Stripe.
    async resolveProviderForMarketplaceBoost(userId: string): Promise<MarketplacePaymentProvider> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true },
        });

        if (user?.stripeCustomerId) {
            return 'STRIPE';
        }

        return 'STRIPE';
    }
}
