import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    PaymentProvider,
    resolvePaymentProviderFromCountry,
    resolvePaymentProviderFromOrigin,
} from '../../common/payment-provider.util';

export type MarketplacePaymentProvider = PaymentProvider;

@Injectable()
export class PaymentProviderResolver {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Resolve payment provider for a user.
     * Prefer persisted paymentProvider; fall back to country/origin; default STRIPE.
     */
    async resolveProviderForUser(userId: string): Promise<PaymentProvider> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { paymentProvider: true, country: true },
        });

        if (!user) return 'STRIPE';

        const stored = (user.paymentProvider || '').toUpperCase();
        if (stored === 'PAGBANK' || stored === 'STRIPE') {
            return stored;
        }

        return resolvePaymentProviderFromCountry(user.country);
    }

    async resolveProviderForMarketplaceBoost(userId: string): Promise<MarketplacePaymentProvider> {
        return this.resolveProviderForUser(userId);
    }

    /**
     * Ensure user has paymentProvider set (backfill from country if missing).
     */
    async ensureUserPaymentProvider(userId: string): Promise<PaymentProvider> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, paymentProvider: true, country: true },
        });
        if (!user) return 'STRIPE';

        const stored = (user.paymentProvider || '').toUpperCase();
        if (stored === 'PAGBANK' || stored === 'STRIPE') {
            return stored as PaymentProvider;
        }

        const provider = resolvePaymentProviderFromCountry(user.country);
        await this.prisma.user.update({
            where: { id: userId },
            data: { paymentProvider: provider },
        });
        return provider;
    }

    resolveFromOrigin(country?: string | null, location?: string | null) {
        return resolvePaymentProviderFromOrigin({ country, location });
    }
}
