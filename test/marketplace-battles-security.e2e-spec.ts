import {
    ForbiddenException,
    INestApplication,
    UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';

jest.mock('@nestjs/passport', () => ({
    AuthGuard:
        () =>
            class {
                canActivate(context: any) {
                    const req = context.switchToHttp().getRequest();
                    const authHeader = req.headers?.authorization;
                    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
                        throw new UnauthorizedException('Unauthorized');
                    }

                    const token = authHeader.slice('Bearer '.length).trim();
                    if (!token) {
                        throw new UnauthorizedException('Unauthorized');
                    }

                    req.user = { userId: token, sub: token };
                    return true;
                }
            },
}));

import { MarketplaceBattleBoostController } from '../src/marketPlace/marketplace-battles/marketplace-battle-boost.controller';
import { MarketplaceBattleBoostService } from '../src/marketPlace/marketplace-battles/marketplace-battle-boost.service';
import { MarketplaceBattlesController } from '../src/marketPlace/marketplace-battles/marketplace-battles.controller';
import { MarketplaceBattlesPublicController } from '../src/marketPlace/marketplace-battles/marketplace-battles-public.controller';
import { MarketplaceBattlesService } from '../src/marketPlace/marketplace-battles/marketplace-battles.service';
import { NotificationController } from '../src/notification/notification.controller';
import { NotificationService } from '../src/notification/notification.service';

describe('Marketplace Battle Step 16 Security/Auth E2E', () => {
    let app: INestApplication<App>;

    const sellerA = '11111111-1111-4111-8111-111111111111';
    const sellerB = '22222222-2222-4222-8222-222222222222';
    const battleOwnedByB = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const battleOwnedByA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const boostOwnedByB = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const commentOwnedByB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

    const assertAuth = (userId: string | undefined) => {
        if (!userId) {
            throw new UnauthorizedException('Unauthorized');
        }
        return userId;
    };

    const marketplaceBattlesService = {
        createDraftBattle: jest.fn(async (userId: string, dto: any) => {
            assertAuth(userId);
            return { id: battleOwnedByA, userId, dto };
        }),
        listMyBattles: jest.fn(async (userId: string) => {
            assertAuth(userId);
            return { battles: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }),
        getMyBattleById: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            return { id: battleId, sellerId: userId };
        }),
        updateDraftBattle: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            if (userId === sellerA && battleId === battleOwnedByB) {
                throw new ForbiddenException('Forbidden: battle not owned by seller');
            }
            return { id: battleId };
        }),
        deleteDraftBattle: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            if (userId === sellerA && battleId === battleOwnedByB) {
                throw new ForbiddenException('Forbidden: battle not owned by seller');
            }
            return { battleId };
        }),
        publishDraftBattle: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            if (userId === sellerA && battleId === battleOwnedByB) {
                throw new ForbiddenException('Forbidden: battle not owned by seller');
            }
            return { id: battleId, status: 'LIVE' };
        }),
        createChallengeBattle: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            if (userId === sellerA && battleId === battleOwnedByB) {
                throw new ForbiddenException('Forbidden: battle not owned by seller');
            }
            return { id: 'challenge-battle-1' };
        }),
        cancelMarketplaceBattle: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            if (userId === sellerA && battleId === battleOwnedByB) {
                throw new ForbiddenException('Forbidden: battle not owned by seller');
            }
            return { id: battleId, status: 'CANCELLED' };
        }),
        voteMarketplaceBattle: jest.fn(async (userId: string) => {
            assertAuth(userId);
            return { ok: true };
        }),
        removeMarketplaceBattleVote: jest.fn(async (userId: string) => {
            assertAuth(userId);
            return { ok: true };
        }),
        createMarketplaceBattleComment: jest.fn(async (userId: string) => {
            assertAuth(userId);
            return { ok: true };
        }),
        listMarketplaceBattleComments: jest.fn(async () => ({ comments: [], total: 0, page: 1, limit: 20, totalPages: 0 })),
        deleteMarketplaceBattleComment: jest.fn(async (userId: string, _battleId: string, commentId: string) => {
            assertAuth(userId);
            if (userId === sellerA && commentId === commentOwnedByB) {
                throw new ForbiddenException('You can only delete your own marketplace battle comments');
            }
            return { commentId };
        }),
        getMarketplaceBattleInsights: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            if (userId === sellerA && battleId === battleOwnedByB) {
                throw new ForbiddenException('Forbidden: battle not owned by seller');
            }
            return { battleId };
        }),
        explorePublicBattles: jest.fn(async () => ({
            battles: [
                {
                    id: battleOwnedByA,
                    title: 'Public battle',
                    seller: { id: sellerA, name: 'Seller A', profileImage: null },
                },
            ],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
        })),
        getClosetPublicBattles: jest.fn(async () => ({ battles: [], total: 0, page: 1, limit: 10, totalPages: 0 })),
        getClosetMarketplaceBattleWinners: jest.fn(async () => ({ winners: [], total: 0, page: 1, limit: 10, totalPages: 0 })),
        getPublicBattleById: jest.fn(async (battleId: string) => ({ id: battleId })),
        getMarketplaceBattleResults: jest.fn(async (battleId: string) => ({ id: battleId })),
    };

    const boostService = {
        getActiveBoostPackages: jest.fn(async () => []),
        createBoostIntent: jest.fn(async (userId: string, battleId: string) => {
            assertAuth(userId);
            if (userId === sellerA && battleId === battleOwnedByB) {
                throw new ForbiddenException('Forbidden: battle not owned by seller');
            }
            return { id: 'boost-1' };
        }),
        createOrReuseBoostPayment: jest.fn(async (userId: string, boostId: string) => {
            assertAuth(userId);
            if (userId === sellerA && boostId === boostOwnedByB) {
                throw new ForbiddenException('Forbidden: boost not owned by seller');
            }
            return { boostId };
        }),
        getMyBoosts: jest.fn(async (userId: string) => {
            assertAuth(userId);
            return { boosts: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }),
        getMyBoostById: jest.fn(async (userId: string, boostId: string) => {
            assertAuth(userId);
            if (userId === sellerA && boostId === boostOwnedByB) {
                throw new ForbiddenException('Forbidden: boost not owned by seller');
            }
            return { id: boostId };
        }),
        getActiveBoostsPublic: jest.fn(async () => ({ boosts: [], total: 0, page: 1, limit: 10, totalPages: 0 })),
    };

    const notificationService = {
        getNotifications: jest.fn(async (userId: string) => [
            {
                id: 'notif-1',
                userId,
                title: 'n',
                body: 'b',
                data: { type: 'battle_created' },
                isRead: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ]),
        getLikePostNotifications: jest.fn(async () => []),
        getMissionDonationNotifications: jest.fn(async () => []),
        getPayFollowingNotifications: jest.fn(async () => []),
        getBattleNotifications: jest.fn(async () => []),
        markNotificationAsRead: jest.fn(async () => ({ total: 1 })),
        markSingleNotificationAsRead: jest.fn(async (_userId: string, notificationId: string) => ({
            updated: notificationId !== 'foreign-notification',
        })),
        markAllNotificationsAsRead: jest.fn(async () => ({ total: 1 })),
        getUnreadNotificationCount: jest.fn(async () => 1),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [
                MarketplaceBattlesController,
                MarketplaceBattlesPublicController,
                MarketplaceBattleBoostController,
                NotificationController,
            ],
            providers: [
                { provide: MarketplaceBattlesService, useValue: marketplaceBattlesService },
                { provide: MarketplaceBattleBoostService, useValue: boostService },
                { provide: NotificationService, useValue: notificationService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.use((req: any, _res: any, next: () => void) => {
            const authHeader = req.headers?.authorization;
            if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                const token = authHeader.slice('Bearer '.length).trim();
                if (token) {
                    req.user = { userId: token, sub: token };
                }
            }
            next();
        });

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('1) unauthenticated seller cannot create marketplace battle', async () => {
        await request(app.getHttpServer())
            .post('/marketplace-battles')
            .send({
                title: 'My battle',
                productIds: [
                    '44444444-4444-4444-8444-444444444444',
                    '55555555-5555-4555-8555-555555555555',
                ],
                endAt: '2026-08-01T10:00:00.000Z',
            })
            .expect(401);
    });

    it('2) seller A cannot edit seller B battle', async () => {
        await request(app.getHttpServer())
            .patch(`/marketplace-battles/${battleOwnedByB}`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({ title: 'Edited' })
            .expect(403);
    });

    it('3) seller A cannot delete seller B battle', async () => {
        await request(app.getHttpServer())
            .delete(`/marketplace-battles/${battleOwnedByB}`)
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(403);
    });

    it('4) seller A cannot publish seller B battle', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battles/${battleOwnedByB}/publish`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({ endAt: '2026-08-01T10:00:00.000Z' })
            .expect(403);
    });

    it('5) seller A cannot cancel seller B battle', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battles/${battleOwnedByB}/cancel`)
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(403);
    });

    it('6) seller A cannot challenge seller B battle', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battles/${battleOwnedByB}/challenge`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({ challengerProductId: '66666666-6666-4666-8666-666666666666' })
            .expect(403);
    });

    it('7) seller A cannot access seller B insights', async () => {
        await request(app.getHttpServer())
            .get(`/marketplace-battles/${battleOwnedByB}/insights`)
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(403);
    });

    it('8) seller A cannot create boost for seller B battle', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battles/${battleOwnedByB}/boosts`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({ packageId: '77777777-7777-4777-8777-777777777777' })
            .expect(403);
    });

    it('9) seller A cannot create payment for seller B boost', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battle-boosts/${boostOwnedByB}/payment`)
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(403);
    });

    it('10) seller A cannot access seller B boost detail', async () => {
        await request(app.getHttpServer())
            .get(`/marketplace-battle-boosts/${boostOwnedByB}`)
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(403);
    });

    it('11) user cannot delete another user comment', async () => {
        await request(app.getHttpServer())
            .delete(`/marketplace-battles/${battleOwnedByA}/comments/${commentOwnedByB}`)
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(403);
    });

    it('12) notifications are scoped to authenticated user', async () => {
        const response = await request(app.getHttpServer())
            .get('/notifications')
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(200);

        expect(Array.isArray(response.body.notifications)).toBe(true);
        for (const notification of response.body.notifications) {
            if (notification.userId) {
                expect(notification.userId).toBe(sellerA);
            }
        }
    });

    it('13) user cannot mark another user notification read', async () => {
        const response = await request(app.getHttpServer())
            .put('/notifications/read/foreign-notification')
            .set('Authorization', `Bearer ${sellerA}`)
            .expect(200);

        expect(response.body.updated).toBe(false);
    });

    it('14) public explore does not expose private seller fields', async () => {
        const response = await request(app.getHttpServer())
            .get('/marketplace-battles/explore')
            .expect(200);

        expect(response.body.battles[0].seller.email).toBeUndefined();
        expect(response.body.battles[0].seller.phone).toBeUndefined();
    });

    it('15) frontend cannot override lifecycle fields on create battle', async () => {
        await request(app.getHttpServer())
            .post('/marketplace-battles')
            .set('Authorization', `Bearer ${sellerA}`)
            .send({
                title: 'Secure battle',
                productIds: [
                    '44444444-4444-4444-8444-444444444444',
                    '55555555-5555-4555-8555-555555555555',
                ],
                status: 'LIVE',
                winnerParticipantId: '99999999-9999-4999-8999-999999999999',
            })
            .expect(400);
    });

    it('16) frontend cannot override counters on update battle', async () => {
        await request(app.getHttpServer())
            .patch(`/marketplace-battles/${battleOwnedByA}`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({ title: 'new', totalVotes: 999, totalComments: 999 })
            .expect(400);
    });

    it('17) frontend cannot select winner in publish payload', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battles/${battleOwnedByA}/publish`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({
                endAt: '2026-08-01T10:00:00.000Z',
                winnerParticipantId: '88888888-8888-4888-8888-888888888888',
            })
            .expect(400);
    });

    it('18) frontend cannot choose provider/amount/currency for boost payment', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battles/${battleOwnedByA}/boosts`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({
                packageId: '77777777-7777-4777-8777-777777777777',
                paymentProvider: 'PAGBANK',
                amount: 1,
                currency: 'BRL',
            })
            .expect(400);
    });

    it('19) unknown query fields are rejected on public APIs', async () => {
        await request(app.getHttpServer())
            .get('/marketplace-battles/explore?page=1&unexpectedField=x')
            .expect(400);
    });

    it('20) no direct endpoint exists for frontend winner/boost activation toggles', async () => {
        await request(app.getHttpServer())
            .post(`/marketplace-battles/${battleOwnedByA}/select-winner`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({ participantId: '33333333-3333-4333-8333-333333333333' })
            .expect(404);

        await request(app.getHttpServer())
            .post(`/marketplace-battle-boosts/${boostOwnedByB}/activate`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({})
            .expect(404);

        await request(app.getHttpServer())
            .post(`/marketplace-battle-boosts/${boostOwnedByB}/mark-paid`)
            .set('Authorization', `Bearer ${sellerA}`)
            .send({})
            .expect(404);
    });
});
