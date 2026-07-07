import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { MarketplaceBattleStatus } from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 8 Comments)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;

    const now = new Date('2026-07-06T10:00:00.000Z');
    const battleId = '11111111-1111-4111-8111-111111111111';
    const commentId = '22222222-2222-4222-8222-222222222222';
    const userId = 'user-1';

    const makeLiveBattle = (overrides: Record<string, any> = {}) => ({
        id: battleId,
        status: MarketplaceBattleStatus.LIVE,
        startAt: new Date('2026-07-06T09:00:00.000Z'),
        endAt: new Date('2026-07-06T11:00:00.000Z'),
        ...overrides,
    });

    const makeCommentRow = (overrides: Record<string, any> = {}) => ({
        id: commentId,
        comment: 'Great choice',
        createdAt: new Date('2026-07-06T09:30:00.000Z'),
        updatedAt: new Date('2026-07-06T09:30:00.000Z'),
        user: {
            id: userId,
            displayName: 'User One',
            userName: 'user_one',
            image: 'https://example.com/avatar.jpg',
        },
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
            marketplaceBattleComment: {
                create: jest.fn(),
                count: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                updateMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
        };

        prisma.$transaction.mockImplementation(async (arg: any) => {
            if (Array.isArray(arg)) return Promise.all(arg);
            if (typeof arg === 'function') return arg(prisma);
            return arg;
        });

        service = new MarketplaceBattlesService(prisma, {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-comments-1',
            }),
        } as any);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('1) Creates comment in active LIVE battle and increments totalComments', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce({ totalComments: 4 });
        prisma.marketplaceBattleComment.create.mockResolvedValue(makeCommentRow());
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.createMarketplaceBattleComment(userId, battleId, {
            comment: 'Great choice',
        });

        expect(result.message).toBe('Comment added successfully');
        expect(result.totalComments).toBe(4);
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { totalComments: { increment: 1 } } }),
        );
    });

    it('2) Create fails for unauthenticated user', async () => {
        await expect(
            service.createMarketplaceBattleComment(undefined as any, battleId, { comment: 'x' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('3) Create fails when battle is not found', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(null);

        await expect(
            service.createMarketplaceBattleComment(userId, battleId, { comment: 'x' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('4) Create fails when status is not LIVE', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ status: MarketplaceBattleStatus.SCHEDULED }),
        );

        await expect(
            service.createMarketplaceBattleComment(userId, battleId, { comment: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('5) Create fails before startAt', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ startAt: new Date('2026-07-06T10:01:00.000Z') }),
        );

        await expect(
            service.createMarketplaceBattleComment(userId, battleId, { comment: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('6) Create fails at endAt boundary', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ endAt: new Date('2026-07-06T10:00:00.000Z') }),
        );

        await expect(
            service.createMarketplaceBattleComment(userId, battleId, { comment: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('7) Create rolls back when battle counter update fails due to race end', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeLiveBattle());
        prisma.marketplaceBattleComment.create.mockResolvedValue(makeCommentRow());
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.createMarketplaceBattleComment(userId, battleId, { comment: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('8) Create converts serialization failures into retry error', async () => {
        prisma.$transaction.mockRejectedValueOnce(
            new Error('could not serialize access due to read/write dependencies among transactions'),
        );

        await expect(
            service.createMarketplaceBattleComment(userId, battleId, { comment: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('9) List returns comments for LIVE battle in active window', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.count.mockResolvedValue(2);
        prisma.marketplaceBattleComment.findMany.mockResolvedValue([
            makeCommentRow(),
            makeCommentRow({
                id: '33333333-3333-4333-8333-333333333333',
                comment: 'Second comment',
            }),
        ]);

        const result = await service.listMarketplaceBattleComments(battleId, {
            page: 1,
            limit: 20,
            sortOrder: 'desc',
        });

        expect(result.total).toBe(2);
        expect(result.comments).toHaveLength(2);
        expect(result.comments[0].user.name).toBe('User One');
    });

    it('10) List returns comments for COMPLETED battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ status: MarketplaceBattleStatus.COMPLETED }),
        );
        prisma.marketplaceBattleComment.count.mockResolvedValue(1);
        prisma.marketplaceBattleComment.findMany.mockResolvedValue([makeCommentRow()]);

        const result = await service.listMarketplaceBattleComments(battleId, {} as any);

        expect(result.total).toBe(1);
        expect(prisma.marketplaceBattleComment.count).toHaveBeenCalled();
    });

    it('11) List fails when battle is not found', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(null);

        await expect(service.listMarketplaceBattleComments(battleId, {} as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('12) List hides SCHEDULED battle as not found', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ status: MarketplaceBattleStatus.SCHEDULED }),
        );

        await expect(service.listMarketplaceBattleComments(battleId, {} as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('13) List hides DRAFT battle as not found', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ status: MarketplaceBattleStatus.DRAFT }),
        );

        await expect(service.listMarketplaceBattleComments(battleId, {} as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('14) List hides CANCELLED battle as not found', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ status: MarketplaceBattleStatus.CANCELLED }),
        );

        await expect(service.listMarketplaceBattleComments(battleId, {} as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('15) List hides stale LIVE battle with expired endAt', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ endAt: new Date('2026-07-06T09:59:59.000Z') }),
        );

        await expect(service.listMarketplaceBattleComments(battleId, {} as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('16) List uses deterministic ordering with sortOrder and id tie-breaker', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattleComment.findMany.mockResolvedValue([]);

        await service.listMarketplaceBattleComments(battleId, {
            page: 2,
            limit: 5,
            sortOrder: 'asc',
        });

        expect(prisma.marketplaceBattleComment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 5,
                take: 5,
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            }),
        );
    });

    it('17) List excludes soft-deleted comments', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattleComment.findMany.mockResolvedValue([]);

        await service.listMarketplaceBattleComments(battleId, {} as any);

        expect(prisma.marketplaceBattleComment.count).toHaveBeenCalledWith(
            expect.objectContaining({ where: { battleId, deletedAt: null } }),
        );
    });

    it('18) Delete succeeds for owner in LIVE battle and decrements totalComments', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle())
            .mockResolvedValueOnce({ totalComments: 6 });
        prisma.marketplaceBattleComment.findFirst.mockResolvedValue({
            id: commentId,
            userId,
            deletedAt: null,
        });
        prisma.marketplaceBattleComment.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.deleteMarketplaceBattleComment(userId, battleId, commentId);

        expect(result.message).toBe('Comment deleted successfully');
        expect(result.totalComments).toBe(6);
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { totalComments: { decrement: 1 } } }),
        );
    });

    it('19) Delete succeeds for owner in COMPLETED battle', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeLiveBattle({ status: MarketplaceBattleStatus.COMPLETED }))
            .mockResolvedValueOnce({ totalComments: 0 });
        prisma.marketplaceBattleComment.findFirst.mockResolvedValue({
            id: commentId,
            userId,
            deletedAt: null,
        });
        prisma.marketplaceBattleComment.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.deleteMarketplaceBattleComment(userId, battleId, commentId);

        expect(prisma.marketplaceBattleComment.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ deletedAt: null, userId }),
            }),
        );
    });

    it('20) Delete fails for unauthenticated user', async () => {
        await expect(
            service.deleteMarketplaceBattleComment(undefined as any, battleId, commentId),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('21) Delete fails when battle is not found', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(null);

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('22) Delete fails for disallowed battle status', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeLiveBattle({ status: MarketplaceBattleStatus.DRAFT }),
        );

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('23) Delete fails when comment does not exist in battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.findFirst.mockResolvedValue(null);

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('24) Delete fails when comment belongs to another user', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.findFirst.mockResolvedValue({
            id: commentId,
            userId: 'another-user',
            deletedAt: null,
        });

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            ForbiddenException,
        );
    });

    it('25) Delete fails when comment already soft-deleted', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.findFirst.mockResolvedValue({
            id: commentId,
            userId,
            deletedAt: new Date('2026-07-06T09:00:00.000Z'),
        });

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            ConflictException,
        );
    });

    it('26) Delete converts updateMany miss after read into conflict', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.findFirst.mockResolvedValue({
            id: commentId,
            userId,
            deletedAt: null,
        });
        prisma.marketplaceBattleComment.updateMany.mockResolvedValue({ count: 0 });

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            ConflictException,
        );
    });

    it('27) Delete throws integrity error when totalComments underflow is prevented', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeLiveBattle());
        prisma.marketplaceBattleComment.findFirst.mockResolvedValue({
            id: commentId,
            userId,
            deletedAt: null,
        });
        prisma.marketplaceBattleComment.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('28) Delete converts serialization failures into retry error', async () => {
        prisma.$transaction.mockRejectedValueOnce(
            new Error('could not serialize access due to read/write dependencies among transactions'),
        );

        await expect(service.deleteMarketplaceBattleComment(userId, battleId, commentId)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });
});
