import {
    MarketplaceBattleBoostStatus,
    MarketplaceBattleStatus,
    Prisma,
} from '@prisma/client';
import { MarketplaceBattleBoostService } from './marketplace-battle-boost.service';

describe('MarketplaceBattleBoostService', () => {
    let service: MarketplaceBattleBoostService;
    let prisma: any;
    let resolver: any;

    beforeEach(() => {
        const now = Date.now();
        const liveStart = new Date(now - 60 * 60 * 1000);
        const liveEnd = new Date(now + 60 * 60 * 1000);

        prisma = {
            marketplaceBattleBoostPackage: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
            marketplaceBattle: {
                findUnique: jest.fn(),
            },
            marketplaceBattleBoost: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
            marketPlacePayments: {
                create: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
                findFirst: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
        };

        prisma.$transaction.mockImplementation(async (arg: any) => {
            if (typeof arg === 'function') {
                const tx = {
                    ...prisma,
                    $queryRaw: jest.fn(),
                };
                return arg(tx);
            }
            return arg;
        });

        resolver = {
            resolveProviderForMarketplaceBoost: jest.fn().mockResolvedValue('STRIPE'),
        };

        service = new MarketplaceBattleBoostService(prisma, resolver);
        (service as any).stripe = {
            checkout: {
                sessions: {
                    create: jest.fn().mockResolvedValue({
                        id: 'cs_1',
                        url: 'https://checkout.stripe.com/test',
                        payment_intent: 'pi_1',
                    }),
                },
            },
        };

        (service as any).__testLiveStart = liveStart;
        (service as any).__testLiveEnd = liveEnd;
    });

    it('returns active boost packages only', async () => {
        prisma.marketplaceBattleBoostPackage.findMany.mockResolvedValue([]);

        await service.getActiveBoostPackages();

        expect(prisma.marketplaceBattleBoostPackage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { isActive: true },
            }),
        );
    });

    it('rejects boost intent for another seller battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'battle-1',
            sellerId: 'seller-2',
            closetId: 'closet-1',
            status: MarketplaceBattleStatus.LIVE,
            startAt: (service as any).__testLiveStart,
            endAt: (service as any).__testLiveEnd,
        });

        await expect(
            service.createBoostIntent('seller-1', 'battle-1', { packageId: 'pkg-1' } as any),
        ).rejects.toThrow('Forbidden');
    });

    it('blocks duplicate non-terminal boosts', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'battle-1',
            sellerId: 'seller-1',
            closetId: 'closet-1',
            status: MarketplaceBattleStatus.LIVE,
            startAt: (service as any).__testLiveStart,
            endAt: (service as any).__testLiveEnd,
        });
        prisma.marketplaceBattleBoostPackage.findUnique.mockResolvedValue({
            id: 'pkg-1',
            isActive: true,
            price: new Prisma.Decimal('4.99'),
            currency: 'USD',
        });
        prisma.marketplaceBattleBoost.findFirst.mockResolvedValue({
            id: 'boost-1',
            status: MarketplaceBattleBoostStatus.PENDING_PAYMENT,
        });

        await expect(
            service.createBoostIntent('seller-1', 'battle-1', { packageId: 'pkg-1' }),
        ).rejects.toThrow('pending or active boost already exists');
    });

    it('creates pending boost intent with amount snapshot', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'battle-1',
            sellerId: 'seller-1',
            closetId: 'closet-1',
            status: MarketplaceBattleStatus.LIVE,
            startAt: (service as any).__testLiveStart,
            endAt: (service as any).__testLiveEnd,
        });
        prisma.marketplaceBattleBoostPackage.findUnique.mockResolvedValue({
            id: 'pkg-1',
            isActive: true,
            price: new Prisma.Decimal('4.99'),
            currency: 'usd',
        });
        prisma.marketplaceBattleBoost.findFirst.mockResolvedValue(null);
        prisma.marketplaceBattleBoost.create.mockResolvedValue({
            id: 'boost-1',
            status: MarketplaceBattleBoostStatus.PENDING_PAYMENT,
            amount: new Prisma.Decimal('4.99'),
            currency: 'USD',
        });

        const result = await service.createBoostIntent('seller-1', 'battle-1', { packageId: 'pkg-1' });

        expect(result.status).toBe(MarketplaceBattleBoostStatus.PENDING_PAYMENT);
        expect(prisma.marketplaceBattleBoost.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    amount: new Prisma.Decimal('4.99'),
                    currency: 'USD',
                }),
            }),
        );
    });

    it('reuses existing pending checkout session idempotently', async () => {
        prisma.marketplaceBattleBoost.findUnique.mockResolvedValue({
            id: 'boost-1',
            sellerId: 'seller-1',
            battleId: 'battle-1',
            amount: new Prisma.Decimal('4.99'),
            currency: 'USD',
            status: MarketplaceBattleBoostStatus.PENDING_PAYMENT,
            paymentId: 'pay-1',
            payment: {
                id: 'pay-1',
                status: 'PENDING',
                metadata: {
                    checkoutUrl: 'https://checkout.stripe.com/existing',
                    checkoutSessionId: 'cs_existing',
                },
            },
        });

        const result = await service.createOrReuseBoostPayment('seller-1', 'boost-1');

        expect(result.payment.checkoutSessionId).toBe('cs_existing');
        expect(prisma.marketPlacePayments.create).not.toHaveBeenCalled();
    });

    it('marks pending boost failed on verified payment failure', async () => {
        prisma.marketPlacePayments.findFirst.mockResolvedValue({ id: 'pay-1' });

        await service.handleVerifiedPaymentFailure({
            id: 'pi_1',
            metadata: { type: 'marketplace_battle_boost', paymentId: 'pay-1' },
        } as any);

        expect(prisma.marketPlacePayments.update).toHaveBeenCalled();
        expect(prisma.marketplaceBattleBoost.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: MarketplaceBattleBoostStatus.PENDING_PAYMENT }),
                data: expect.objectContaining({ status: MarketplaceBattleBoostStatus.FAILED }),
            }),
        );
    });
});
