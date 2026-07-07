import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Prisma, WhoCanBuy } from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 7 Voting)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;

    const now = new Date('2026-07-06T10:00:00.000Z');
    const battleId = '11111111-1111-4111-8111-111111111111';
    const participantAId = '22222222-2222-4222-8222-222222222222';
    const participantBId = '33333333-3333-4333-8333-333333333333';

    const makeLiveBattle = (overrides: Record<string, any> = {}) => ({
        id: battleId,
        sellerId: 'seller-1',
        status: 'LIVE',
        startAt: new Date('2026-07-06T09:00:00.000Z'),
        endAt: new Date('2026-07-06T11:00:00.000Z'),
        ...overrides,
    });

    const makeParticipant = (overrides: Record<string, any> = {}) => ({
        id: participantAId,
        battleId,
        productId: 'prod-a',
        product: {
            isActive: true,
            isDeleted: false,
            quantity: 2,
        },
        ...overrides,
    });

    const makeBattleAfterVote = (overrides: Record<string, any> = {}) => ({
        totalVotes: 101,
        participants: [
            { id: participantAId, position: 1, voteCount: 61 },
            { id: participantBId, position: 2, voteCount: 40 },
        ],
        ...overrides,
    });

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(now);

        prisma = {
            marketplaceBattle: {
                findUnique: jest.fn(),
                updateMany: jest.fn(),
            },
            followerAndFollowing: {
                findUnique: jest.fn(),
            },
            marketplaceBattleParticipant: {
                findFirst: jest.fn(),
                updateMany: jest.fn(),
            },
            marketplaceBattleVote: {
                findUnique: jest.fn(),
                create: jest.fn(),
                deleteMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
        };

        prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

        service = new MarketplaceBattlesService(prisma, {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-voting-1',
            }),
        } as any);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('1) Authenticated user can vote in valid LIVE battle', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });

        expect(result.message).toBe('Vote submitted successfully');
    });

    it('2) Vote row is created', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });

        expect(prisma.marketplaceBattleVote.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ battleId, participantId: participantAId, userId: 'user-1' }),
            }),
        );
    });

    it('3) Participant voteCount increments', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });

        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { voteCount: { increment: 1 } } }),
        );
    });

    it('4) Battle totalVotes increments', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { totalVotes: { increment: 1 } } }),
        );
    });

    it('5) Seller cannot vote in own battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle({ sellerId: 'user-1' }));

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('6) User cannot vote in DRAFT battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle({ status: 'DRAFT' }));

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('6.1) followers-only battle allows accepted follower vote', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle({ whoCanVote: WhoCanBuy.followers }))
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.followerAndFollowing.findUnique.mockResolvedValue({ status: 'ACCEPTED' });
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });

        expect(result.message).toBe('Vote submitted successfully');
        expect(prisma.followerAndFollowing.findUnique).toHaveBeenCalled();
    });

    it('6.2) followers-only battle rejects non-follower vote', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeLiveBattle({ whoCanVote: WhoCanBuy.followers }),
        );
        prisma.followerAndFollowing.findUnique.mockResolvedValue(null);

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('7) User cannot vote in SCHEDULED battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle({ status: 'SCHEDULED' }));

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('8) User cannot vote in COMPLETED battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle({ status: 'COMPLETED' }));

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('9) User cannot vote in CANCELLED battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle({ status: 'CANCELLED' }));

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('10) User cannot vote before startAt', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeLiveBattle({ startAt: new Date('2026-07-06T10:01:00.000Z') }),
        );

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('11) User cannot vote at/after endAt', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeLiveBattle({ endAt: new Date('2026-07-06T10:00:00.000Z') }),
        );

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('12) Participant from another battle is rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(null);

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('13) Duplicate sequential vote is rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue({ id: 'vote-existing' });

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('14) Two simultaneous votes from same user produce only one success', async () => {
        let hasVote = false;
        prisma.marketplaceBattle.findUnique.mockImplementation(async (args: any) => {
            if (args?.select?.participants) {
                return makeBattleAfterVote();
            }
            return makeLiveBattle();
        });
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockImplementation(async () => (hasVote ? { id: 'vote-existing' } : null));
        prisma.marketplaceBattleVote.create.mockImplementation(async () => {
            if (hasVote) {
                throw { code: 'P2002' };
            }
            hasVote = true;
            return { id: 'vote-1' };
        });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const results = await Promise.allSettled([
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ]);

        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('15) Database unique violation is converted to clean API error', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockRejectedValue({ code: 'P2002' });

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('16) Vote creation failure rolls back counter updates', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockRejectedValue(new Error('create failed'));

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toThrow('create failed');

        expect(prisma.marketplaceBattleParticipant.updateMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
    });

    it('17) Participant counter update failure rolls back vote creation', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('18) Battle counter update failure rolls back vote and participant update', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('19) Vote cannot commit concurrently after lifecycle worker completes battle', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeLiveBattle({ status: 'COMPLETED' }));
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('20) Successful response participants ordered by position ASC', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(
                makeBattleAfterVote({
                    participants: [
                        { id: participantBId, position: 2, voteCount: 40 },
                        { id: participantAId, position: 1, voteCount: 61 },
                    ],
                }),
            );
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });
        expect(result.participants.map((p: any) => p.position)).toEqual([1, 2]);
    });

    it('21) Vote percentages are correct', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });
        expect(result.participants[0].votePercentage).toBe(60.4);
        expect(result.participants[1].votePercentage).toBe(39.6);
    });

    it('22) User can remove own vote', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote({ totalVotes: 100, participants: [{ id: participantAId, position: 1, voteCount: 60 }, { id: participantBId, position: 2, voteCount: 40 }] }));
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue({ id: 'vote-1', participantId: participantAId });
        prisma.marketplaceBattleVote.deleteMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.removeMarketplaceBattleVote('user-1', battleId);
        expect(result.message).toBe('Vote removed successfully');
    });

    it('23) Vote row is deleted on removal', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue({ id: 'vote-1', participantId: participantAId });
        prisma.marketplaceBattleVote.deleteMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.removeMarketplaceBattleVote('user-1', battleId);
        expect(prisma.marketplaceBattleVote.deleteMany).toHaveBeenCalled();
    });

    it('24) Participant voteCount decrements', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue({ id: 'vote-1', participantId: participantAId });
        prisma.marketplaceBattleVote.deleteMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.removeMarketplaceBattleVote('user-1', battleId);
        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { voteCount: { decrement: 1 } } }),
        );
    });

    it('25) Battle totalVotes decrements', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue({ id: 'vote-1', participantId: participantAId });
        prisma.marketplaceBattleVote.deleteMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.removeMarketplaceBattleVote('user-1', battleId);
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { totalVotes: { decrement: 1 } } }),
        );
    });

    it('26) User cannot remove another user vote', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);

        await expect(service.removeMarketplaceBattleVote('user-1', battleId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('27) Removing when no vote exists returns clean error', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);

        await expect(service.removeMarketplaceBattleVote('user-1', battleId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('28) Two simultaneous removals decrement counters only once', async () => {
        let hasVote = true;
        prisma.marketplaceBattle.findUnique.mockImplementation(async (...args: any[]) => {
            const query = args[0];
            if (query?.select?.participants) {
                return makeBattleAfterVote({ totalVotes: 99, participants: [{ id: participantAId, position: 1, voteCount: 59 }, { id: participantBId, position: 2, voteCount: 40 }] });
            }
            return makeLiveBattle();
        });
        prisma.marketplaceBattleVote.findUnique.mockImplementation(async () => (hasVote ? { id: 'vote-1', participantId: participantAId } : null));
        prisma.marketplaceBattleVote.deleteMany.mockImplementation(async () => {
            if (!hasVote) return { count: 0 };
            hasVote = false;
            return { count: 1 };
        });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const results = await Promise.allSettled([
            service.removeMarketplaceBattleVote('user-1', battleId),
            service.removeMarketplaceBattleVote('user-1', battleId),
        ]);

        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('29) Counter underflow protection rolls back transaction', async () => {
        const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue({ id: 'vote-1', participantId: participantAId });
        prisma.marketplaceBattleVote.deleteMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 0 });

        await expect(service.removeMarketplaceBattleVote('user-1', battleId)).rejects.toBeInstanceOf(InternalServerErrorException);
        expect(loggerSpy).toHaveBeenCalled();
    });

    it('30) Seller can remove pre-existing own vote while LIVE', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle({ sellerId: 'user-1' }))
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue({ id: 'vote-1', participantId: participantAId });
        prisma.marketplaceBattleVote.deleteMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await expect(service.removeMarketplaceBattleVote('user-1', battleId)).resolves.toBeTruthy();
    });

    it('31) Removing vote outside LIVE voting window is rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle({ endAt: new Date('2026-07-06T10:00:00.000Z') }));

        await expect(service.removeMarketplaceBattleVote('user-1', battleId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('32) Lifecycle completion and vote/remove use compatible concurrency protection', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce(makeBattleAfterVote());
        prisma.marketplaceBattleParticipant.findFirst.mockResolvedValue(makeParticipant());
        prisma.marketplaceBattleVote.findUnique.mockResolvedValue(null);
        prisma.marketplaceBattleVote.create.mockResolvedValue({ id: 'vote-1' });
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.voteMarketplaceBattle('user-1', battleId, { participantId: participantAId });

        expect(prisma.$transaction).toHaveBeenCalledWith(
            expect.any(Function),
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        expect(prisma.$queryRaw).toHaveBeenCalled();
    });
});
