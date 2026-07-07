import { MarketplaceBattleBoostStatus, MarketplaceBattleStatus } from '@prisma/client';
import { MarketplaceBattleBoostLifecycleService } from './marketplace-battle-boost-lifecycle.service';

describe('MarketplaceBattleBoostLifecycleService', () => {
    let service: MarketplaceBattleBoostLifecycleService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            marketplaceBattleBoost: {
                findMany: jest.fn(),
                updateMany: jest.fn(),
            },
        };

        service = new MarketplaceBattleBoostLifecycleService(prisma);
    });

    it('expires active boost when endAt has elapsed', async () => {
        const now = new Date('2026-07-06T10:00:00.000Z');
        prisma.marketplaceBattleBoost.findMany
            .mockResolvedValueOnce([
                {
                    id: 'boost-1',
                    endAt: new Date('2026-07-06T09:59:00.000Z'),
                    battle: { status: MarketplaceBattleStatus.LIVE, endAt: new Date('2026-07-06T11:00:00.000Z') },
                },
            ])
            .mockResolvedValueOnce([]);
        prisma.marketplaceBattleBoost.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.runBoostLifecycle(now);

        expect(result.expired).toBe(1);
        expect(prisma.marketplaceBattleBoost.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: 'boost-1',
                    status: MarketplaceBattleBoostStatus.ACTIVE,
                },
            }),
        );
    });

    it('expires active boost when battle is completed', async () => {
        const now = new Date('2026-07-06T10:00:00.000Z');
        prisma.marketplaceBattleBoost.findMany
            .mockResolvedValueOnce([
                {
                    id: 'boost-1',
                    endAt: new Date('2026-07-06T10:30:00.000Z'),
                    battle: { status: MarketplaceBattleStatus.COMPLETED, endAt: new Date('2026-07-06T10:30:00.000Z') },
                },
            ])
            .mockResolvedValueOnce([]);
        prisma.marketplaceBattleBoost.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.runBoostLifecycle(now);
        expect(result.expired).toBe(1);
    });

    it('does not overwrite non-active states due to conditional update', async () => {
        const now = new Date('2026-07-06T10:00:00.000Z');
        prisma.marketplaceBattleBoost.findMany
            .mockResolvedValueOnce([
                {
                    id: 'boost-1',
                    endAt: new Date('2026-07-06T09:59:00.000Z'),
                    battle: { status: MarketplaceBattleStatus.LIVE, endAt: new Date('2026-07-06T11:00:00.000Z') },
                },
            ])
            .mockResolvedValueOnce([]);
        prisma.marketplaceBattleBoost.updateMany.mockResolvedValue({ count: 0 });

        const result = await service.runBoostLifecycle(now);
        expect(result.skipped).toBe(1);
    });

    it('overlap guard skips second in-process run', async () => {
        prisma.marketplaceBattleBoost.findMany.mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return [];
        });

        const first = service.runBoostLifecycle(new Date('2026-07-06T10:00:00.000Z'));
        const second = service.runBoostLifecycle(new Date('2026-07-06T10:00:00.000Z'));

        const [firstResult, secondResult] = await Promise.all([first, second]);

        expect(firstResult).toEqual({ expired: 0, skipped: 0, failed: 0 });
        expect(secondResult).toEqual({ expired: 0, skipped: 0, failed: 0 });
    });
});
