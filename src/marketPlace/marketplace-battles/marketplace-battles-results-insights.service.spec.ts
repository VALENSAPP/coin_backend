import {
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
} from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 9 Results + Insights)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;

    const battleId = 'battle-1';
    const sellerId = 'seller-1';
    const otherSellerId = 'seller-2';
    const participant1Id = 'participant-1';
    const participant2Id = 'participant-2';

    const makeWinnerBattle = (overrides: Record<string, any> = {}) => ({
        id: battleId,
        sellerId,
        title: 'Summer Style Battle',
        description: 'Choose the best look',
        category: 'Fashion',
        status: MarketplaceBattleStatus.COMPLETED,
        outcome: MarketplaceBattleOutcome.WINNER,
        startAt: new Date('2026-07-05T10:00:00.000Z'),
        endAt: new Date('2026-07-06T10:00:00.000Z'),
        publishedAt: new Date('2026-07-05T09:50:00.000Z'),
        completedAt: new Date('2026-07-06T10:00:01.000Z'),
        winnerParticipantId: participant1Id,
        totalVotes: 100,
        totalComments: 25,
        seller: {
            id: sellerId,
            displayName: 'Seller One',
            userName: 'seller_one',
            image: 'seller.jpg',
            email: 'hidden@example.com',
            phone: '9999999999',
        },
        closet: {
            id: 'closet-1',
            shopName: 'My Shop',
            shopUsername: 'myshop',
            shopLogo: 'logo.jpg',
        },
        participants: [
            {
                id: participant1Id,
                battleId,
                productId: 'product-1',
                position: 1,
                voteCount: 60,
                isWinner: true,
                product: {
                    id: 'product-1',
                    name: 'Blue Dress',
                    images: ['p1.jpg'],
                    price: 100,
                    category: 'Fashion',
                    brand: 'Brand A',
                    condition: 'NEW',
                },
            },
            {
                id: participant2Id,
                battleId,
                productId: 'product-2',
                position: 2,
                voteCount: 40,
                isWinner: false,
                product: {
                    id: 'product-2',
                    name: 'Red Dress',
                    images: ['p2.jpg'],
                    price: 90,
                    category: 'Fashion',
                    brand: 'Brand B',
                    condition: 'NEW',
                },
            },
        ],
        winnerParticipant: {
            id: participant1Id,
            battleId,
            product: {
                id: 'product-1',
                name: 'Blue Dress',
                images: ['p1.jpg'],
                price: 100,
                category: 'Fashion',
                brand: 'Brand A',
                condition: 'NEW',
            },
        },
        ...overrides,
    });

    const makeTieBattle = (overrides: Record<string, any> = {}) =>
        makeWinnerBattle({
            outcome: MarketplaceBattleOutcome.TIE,
            winnerParticipantId: null,
            participants: [
                {
                    id: participant1Id,
                    battleId,
                    productId: 'product-1',
                    position: 1,
                    voteCount: 50,
                    isWinner: false,
                    product: {
                        id: 'product-1',
                        name: 'Blue Dress',
                        images: ['p1.jpg'],
                        price: 100,
                        category: 'Fashion',
                        brand: 'Brand A',
                        condition: 'NEW',
                    },
                },
                {
                    id: participant2Id,
                    battleId,
                    productId: 'product-2',
                    position: 2,
                    voteCount: 50,
                    isWinner: false,
                    product: {
                        id: 'product-2',
                        name: 'Red Dress',
                        images: ['p2.jpg'],
                        price: 90,
                        category: 'Fashion',
                        brand: 'Brand B',
                        condition: 'NEW',
                    },
                },
            ],
            winnerParticipant: null,
            ...overrides,
        });

    beforeEach(() => {
        prisma = {
            marketplaceBattle: {
                findUnique: jest.fn(),
                updateMany: jest.fn(),
                create: jest.fn(),
                deleteMany: jest.fn(),
            },
        };

        service = new MarketplaceBattlesService(prisma, {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-results-1',
            }),
        } as any);
    });

    it('1) Public results returns completed WINNER battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeWinnerBattle());

        const result = await service.getMarketplaceBattleResults(battleId);

        expect(result.status).toBe('COMPLETED');
        expect(result.outcome).toBe('WINNER');
        expect(result.winner?.participantId).toBe(participant1Id);
    });

    it('2) Public results returns completed TIE battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeTieBattle());

        const result = await service.getMarketplaceBattleResults(battleId);

        expect(result.outcome).toBe('TIE');
        expect(result.winner).toBeNull();
        expect(result.voteDifference).toBe(0);
    });

    it('3) Results rejects DRAFT', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ status: MarketplaceBattleStatus.DRAFT }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('4) Results rejects SCHEDULED', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ status: MarketplaceBattleStatus.SCHEDULED }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('5) Results rejects LIVE', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ status: MarketplaceBattleStatus.LIVE }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('6) Results rejects CANCELLED', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ status: MarketplaceBattleStatus.CANCELLED }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('7) Results rejects missing completedAt', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ completedAt: null }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('8) Results rejects invalid outcome PENDING', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ outcome: MarketplaceBattleOutcome.PENDING }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('9) Results rejects participant count not equal to 2', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ participants: [makeWinnerBattle().participants[0]] }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('10) Results rejects invalid participant positions', async () => {
        const battle = makeWinnerBattle();
        battle.participants[1].position = 3;
        prisma.marketplaceBattle.findUnique.mockResolvedValue(battle);

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('11) Results rejects duplicate products', async () => {
        const battle = makeWinnerBattle();
        battle.participants[1].productId = battle.participants[0].productId;
        prisma.marketplaceBattle.findUnique.mockResolvedValue(battle);

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('12) Results rejects negative participant voteCount', async () => {
        const battle = makeWinnerBattle();
        battle.participants[0].voteCount = -1;
        prisma.marketplaceBattle.findUnique.mockResolvedValue(battle);

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('13) Results rejects negative totalVotes', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ totalVotes: -1 }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('14) Results rejects negative totalComments', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ totalComments: -1 }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('15) Results rejects participant vote sum mismatch with totalVotes', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ totalVotes: 101 }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('16) WINNER rejects null winnerParticipantId', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ winnerParticipantId: null }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('17) WINNER rejects winner participant from another battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({
                winnerParticipantId: 'foreign-participant',
                winnerParticipant: {
                    id: 'foreign-participant',
                    battleId: 'other-battle',
                    product: makeWinnerBattle().participants[0].product,
                },
            }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('18) WINNER rejects zero/multiple isWinner participants', async () => {
        const zeroWinner = makeWinnerBattle();
        zeroWinner.participants[0].isWinner = false;

        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(zeroWinner);
        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );

        const multipleWinners = makeWinnerBattle();
        multipleWinners.participants[1].isWinner = true;

        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(multipleWinners);
        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('19) WINNER rejects isWinner mismatch with winnerParticipantId', async () => {
        const battle = makeWinnerBattle();
        battle.participants[0].isWinner = false;
        battle.participants[1].isWinner = true;
        prisma.marketplaceBattle.findUnique.mockResolvedValue(battle);

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('20) WINNER rejects winner whose vote count is not greater than loser', async () => {
        const battle = makeWinnerBattle();
        battle.participants[0].voteCount = 50;
        battle.participants[1].voteCount = 50;
        battle.totalVotes = 100;
        prisma.marketplaceBattle.findUnique.mockResolvedValue(battle);

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('21) TIE rejects non-null winnerParticipantId', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeTieBattle({ winnerParticipantId: participant1Id }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('22) TIE rejects any isWinner participant', async () => {
        const battle = makeTieBattle();
        battle.participants[0].isWinner = true;
        prisma.marketplaceBattle.findUnique.mockResolvedValue(battle);

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('23) TIE rejects unequal vote counts', async () => {
        const battle = makeTieBattle();
        battle.participants[0].voteCount = 55;
        battle.participants[1].voteCount = 45;
        battle.totalVotes = 100;
        prisma.marketplaceBattle.findUnique.mockResolvedValue(battle);

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('24) Zero-vote TIE returns 0 percentages', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeTieBattle({
                totalVotes: 0,
                participants: [
                    { ...makeTieBattle().participants[0], voteCount: 0 },
                    { ...makeTieBattle().participants[1], voteCount: 0 },
                ],
            }),
        );

        const result = await service.getMarketplaceBattleResults(battleId);

        expect(result.participants[0].votePercentage).toBe(0);
        expect(result.participants[1].votePercentage).toBe(0);
    });

    it('25) Vote percentages use shared rounding strategy', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({
                totalVotes: 3,
                participants: [
                    { ...makeWinnerBattle().participants[0], voteCount: 2 },
                    { ...makeWinnerBattle().participants[1], voteCount: 1, isWinner: false },
                ],
            }),
        );

        const result = await service.getMarketplaceBattleResults(battleId);

        expect(result.participants[0].votePercentage).toBe(66.67);
        expect(result.participants[1].votePercentage).toBe(33.33);
    });

    it('26) voteDifference is correct', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeWinnerBattle());

        const result = await service.getMarketplaceBattleResults(battleId);

        expect(result.voteDifference).toBe(20);
    });

    it('27) durationSeconds is correct', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeWinnerBattle());

        const result = await service.getMarketplaceBattleResults(battleId);

        expect(result.durationSeconds).toBe(86400);
    });

    it('28) Missing startAt/endAt is treated as integrity failure', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeWinnerBattle({ startAt: null }),
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it('29) Results API performs no writes', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeWinnerBattle());

        await service.getMarketplaceBattleResults(battleId);

        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.create).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.deleteMany).not.toHaveBeenCalled();
    });

    it('30) Public response does not expose votes/comments/private seller data', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeWinnerBattle());

        const result = await service.getMarketplaceBattleResults(battleId);

        expect((result as any).votes).toBeUndefined();
        expect((result as any).comments).toBeUndefined();
        expect((result.seller as any).email).toBeUndefined();
        expect((result.seller as any).phone).toBeUndefined();
    });

    it('31) Seller can access own completed battle insights', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeWinnerBattle());

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.battleId).toBe(battleId);
        expect(result.status).toBe('COMPLETED');
    });

    it('32) Another seller cannot access insights', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce({ id: battleId, sellerId });

        await expect(
            service.getMarketplaceBattleInsights(otherSellerId, battleId),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('33) Unauthenticated user cannot access insights', async () => {
        await expect(
            service.getMarketplaceBattleInsights(undefined as any, battleId),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('34) Insights rejects non-COMPLETED battle', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(
                makeWinnerBattle({ status: MarketplaceBattleStatus.LIVE }),
            );

        await expect(service.getMarketplaceBattleInsights(sellerId, battleId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('35) engagementCount equals totalVotes + totalComments', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeWinnerBattle({ totalVotes: 100, totalComments: 25 }));

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.engagementCount).toBe(125);
    });

    it('36) WINNER insights returns correct winner', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeWinnerBattle());

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.winner?.participantId).toBe(participant1Id);
        expect(result.winner?.voteCount).toBe(60);
    });

    it('37) WINNER insights returns correct loser', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeWinnerBattle());

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.loser?.participantId).toBe(participant2Id);
        expect(result.loser?.voteCount).toBe(40);
    });

    it('38) winningMarginPercentagePoints is correct', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeWinnerBattle());

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.winningMarginPercentagePoints).toBe(20);
    });

    it('39) TIE insights returns winner null', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeTieBattle());

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.winner).toBeNull();
    });

    it('40) TIE insights returns loser null', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeTieBattle());

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.loser).toBeNull();
    });

    it('41) TIE insights returns zero margins', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeTieBattle());

        const result = await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(result.voteDifference).toBe(0);
        expect(result.winningMarginPercentagePoints).toBe(0);
    });

    it('42) Insights performs no writes', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeWinnerBattle());

        await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.create).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.deleteMany).not.toHaveBeenCalled();
    });

    it('43) Queries avoid N+1 structurally', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({ id: battleId, sellerId })
            .mockResolvedValueOnce(makeWinnerBattle());

        await service.getMarketplaceBattleInsights(sellerId, battleId);

        expect(prisma.marketplaceBattle.findUnique).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                where: { id: battleId },
                select: { id: true, sellerId: true },
            }),
        );

        const secondCallArgs = prisma.marketplaceBattle.findUnique.mock.calls[1][0];
        expect(secondCallArgs.select).toEqual(
            expect.objectContaining({
                seller: expect.any(Object),
                closet: expect.any(Object),
                participants: expect.any(Object),
                winnerParticipant: expect.any(Object),
            }),
        );
        expect(secondCallArgs.select.votes).toBeUndefined();
        expect(secondCallArgs.select.comments).toBeUndefined();
    });
});
