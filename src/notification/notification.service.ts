import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    // Save notification to database
    await this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
        data: data || {},
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!(user as any)?.fcmToken) {
      console.log(`No FCM token found for user ${userId}`);
      return;
    }

    const message = {
      token: (user as any).fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async sendNotificationToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    // Save notifications to database (even if some users don't have FCM tokens)
    if (userIds?.length) {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          title,
          body,
          data: data || {},
        })),
      });
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fcmToken: true },
    });

    const tokens = users
      .filter((user) => (user as any).fcmToken)
      .map((user) => (user as any).fcmToken);

    if (tokens.length === 0) {
      console.log('No FCM tokens found for the users');
      return;
    }

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
        },
      },
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log('Successfully sent messages:', response);
    } catch (error) {
      console.error('Error sending messages:', error);
    }
  }

  async getNotifications(userId: string, limit: number = 100): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
    });
  }

  async getBattleNotifications(userId: string, limit: number = 100): Promise<any[]> {
    const notifications = await this.getNotifications(userId, limit);
    const battleNotifs = notifications.filter((n) => {
      const type = (n as any)?.data?.type;
      return typeof type === 'string' && type.startsWith('battle_');
    });

    const battleIds = Array.from(
      new Set(
        battleNotifs
          .map((n) => (n as any)?.data?.battleId as string | undefined)
          .filter(Boolean),
      ),
    ) as string[];

    const battles = battleIds.length
      ? await this.prisma.battle.findMany({
          where: { id: { in: battleIds } },
          select: {
            id: true,
            question: true,
            format: true,
            status: true,
            options: true,
            optionImages: true,
            startTime: true,
            endTime: true,
            isPublic: true,
            creatorId: true,
            liveAt: true,
            closedAt: true,
            resolvedAt: true,
            winningSide: true,
            correctSide: true,
            winnerUserId: true,
          },
        })
      : [];

    const battleMap = new Map(battles.map((b) => [b.id, b]));

    return battleNotifs.map((n) => ({
      ...n,
      battle: battleMap.get((n as any)?.data?.battleId),
    }));
  }

  // Likes on the current user's posts (computed, not stored in Notification table)
  async getLikePostNotifications(userId: string, limit: number = 100): Promise<any[]> {
    const likes = await this.prisma.postLike.findMany({
      where: {
        userId: { not: userId },
        post: {
          userId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        createdAt: true,
        isReadByOwner: true,
        user: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            image: true,
          },
        },
        post: {
          select: {
            id: true,
            text: true,
            images: true,
            createdAt: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
    });

    return likes.map((like) => ({
      id: like.id,
      userId,
      title: 'Post Liked',
      body: `${like.user?.displayName || like.user?.userName || 'Someone'} liked your post.`,
        data: {
          type: 'like',
          likerId: like.user?.id,
          postId: like.post?.id,
        },
        isRead: !!(like as any).isReadByOwner,
        createdAt: like.createdAt,
        updatedAt: like.createdAt,
        post: like.post,
        liker: like.user,
    }));
  }

  // Mission donations on the current user's posts (computed, not stored in Notification table)
  async getMissionDonationNotifications(userId: string, limit: number = 100): Promise<any[]> {
    const donations = await this.prisma.donationData.findMany({
      where: {
        vendorId: userId,
        status: 'completed',
        action: 'missionDonation',
      },
      select: {
        id: true,
        userId: true,
        vendorId: true,
        postId: true,
        amount: true,
        createdAt: true,
        isReadByOwner: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
    });

    const postIds = Array.from(new Set(donations.map((d) => d.postId).filter(Boolean))) as string[];
    const donorIds = Array.from(new Set(donations.map((d) => d.userId)));

    const [posts, donors] = await Promise.all([
      postIds.length > 0
        ? this.prisma.post.findMany({
            where: { id: { in: postIds }, deletedAt: null },
            select: { id: true, text: true, images: true, createdAt: true, type: true },
          })
        : Promise.resolve([]),
      donorIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: donorIds } },
            select: { id: true, userName: true, displayName: true, image: true },
          })
        : Promise.resolve([]),
    ]);

    const postMap = new Map(posts.map((p) => [p.id, p]));
    const donorMap = new Map(donors.map((u) => [u.id, u]));

    return donations.map((donation) => {
      const donor = donorMap.get(donation.userId);
      const post = donation.postId ? postMap.get(donation.postId) : undefined;
      return {
        id: donation.id,
        userId,
        title: 'Mission Donation',
        body: `${donor?.displayName || donor?.userName || 'Someone'} donated $${donation.amount} to your post.`,
        data: {
          type: 'mission_donation',
          donorId: donation.userId,
          postId: donation.postId,
          donationId: donation.id,
        },
        isRead: !!(donation as any).isReadByOwner,
        createdAt: donation.createdAt,
        updatedAt: donation.createdAt,
        post,
        donor,
      };
    });
  }

  // Pay-following payments received by the current user
  async getPayFollowingNotifications(userId: string, limit: number = 100): Promise<any[]> {
    const payments = await this.prisma.payment.findMany({
      where: {
        receiverId: userId,
        forPayment: 'following',
        status: 'succeeded',
      },
      select: {
        id: true,
        userId: true, // payer
        receiverId: true,
        amount: true,
        currency: true,
        createdAt: true,
        isReadByOwner: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
    });

    const payerIds = Array.from(new Set(payments.map((p) => p.userId)));
    const payers = payerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: payerIds } },
          select: { id: true, userName: true, displayName: true, image: true },
        })
      : [];
    const payerMap = new Map(payers.map((u) => [u.id, u]));

    return payments.map((payment) => {
      const payer = payerMap.get(payment.userId);
      return {
        id: payment.id,
        userId,
        title: 'Following Payment',
        body: `${payer?.displayName || payer?.userName || 'Someone'} bought your private content subscription.`,
        data: {
          type: 'pay_following',
          payerId: payment.userId,
          receiverId: payment.receiverId,
          paymentId: payment.id,
        },
        isRead: !!(payment as any).isReadByOwner,
        createdAt: payment.createdAt,
        updatedAt: payment.createdAt,
      };
    });
  }

  async sendBattleInvite(invitedUserId: string, battleId: string): Promise<void> {
    return this.sendNotificationToUser(
      invitedUserId,
      'Battle Invitation',
      'You have been invited to a Battle. Review the forecast and choose your side.',
      { type: 'battle_invite', battleId },
    );
  }

  async sendBattleStarted(userId: string, battleId: string): Promise<void> {
    return this.sendNotificationToUser(
      userId,
      '⚔️ Battle Started',
      'The debate is live. See who joins your side.',
      { type: 'battle_started', battleId },
    );
  }

  async sendBattleNewParticipants(userIds: string[], battleId: string, newCount: number): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    const safeNewCount = Number.isFinite(newCount) && newCount > 0 ? Math.floor(newCount) : 1;

    return this.sendNotificationToMultipleUsers(
      userIds,
      '👥 New Participants!',
      `${safeNewCount} new participants joined your Battle. See which side the community is backing.`,
      { type: 'battle_participant_joined', battleId, newCount: String(safeNewCount) },
    );
  }

  async sendBattleClosingSoon(userIds: string[], battleId: string): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    return this.sendNotificationToMultipleUsers(
      userIds,
      '⏳ Battle Closing Soon',
      'Final votes are coming in. See the current outcome before time runs out.',
      { type: 'battle_closing_soon', battleId },
    );
  }

  async sendBattleCompleted(userIds: string[], battleId: string): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    return this.sendNotificationToMultipleUsers(
      userIds,
      '🏆 Battle Completed',
      'See the final outcome and accuracy result for your Battle.',
      { type: 'battle_completed', battleId },
    );
  }

  async sendBattleDeclined(userId: string, battleId: string): Promise<void> {
    return this.sendNotificationToUser(
      userId,
      'Battle Declined',
      'The invited user declined your battle invite.',
      { type: 'battle_declined', battleId },
    );
  }

  async sendBattleInviteExpired(userId: string, battleId: string, invitedUserName: string): Promise<void> {
    const safeName = invitedUserName?.trim() || 'the invited user';
    return this.sendNotificationToUser(
      userId,
      'Battle Invite Expired',
      `Your battle was not accepted by ${safeName}.`,
      { type: 'battle_invite_expired', battleId, invitedUserName: safeName },
    );
  }

  async sendBattleResult(userIds: string[], battleId: string): Promise<void> {
    if (userIds.length === 0) return;
    return this.sendNotificationToMultipleUsers(
      userIds,
      'Battle Result',
      'Your battle has ended. Check the results.',
      { type: 'battle_result', battleId },
    );
  }

  async sendBattleVictory(userIds: string[], battleId: string): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    return this.sendNotificationToMultipleUsers(
      userIds,
      '🎉 Victory! Your side won!',
      'Your credibility score has increased. Check your updated achievements.',
      { type: 'battle_victory', battleId },
    );
  }

  async sendBattleCreatedToFollowers(userIds: string[], battleId: string, question: string): Promise<void> {
    if (userIds.length === 0) return;
    return this.sendNotificationToMultipleUsers(
      userIds,
      'New Battle',
      `New battle: ${question}`,
      { type: 'battle_new', battleId },
    );
  }

  async sendBattleClosedToFollowers(userIds: string[], battleId: string): Promise<void> {
    if (userIds.length === 0) return;
    return this.sendNotificationToMultipleUsers(
      userIds,
      'Battle Closed',
      'A battle you follow has ended. Check the results.',
      { type: 'battle_closed', battleId },
    );
  }

  async getNotificationById(notificationId: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
  }

  async markNotificationAsRead(userId: string, notificationIds: string[]): Promise<{ total: number }> {
    if (!notificationIds || notificationIds.length === 0) {
      return { total: 0 };
    }

    const [notificationIdsFound, likeIds, donationIds, paymentIds] = await Promise.all([
      this.prisma.notification.findMany({
        where: { id: { in: notificationIds }, userId },
        select: { id: true },
      }),
      this.prisma.postLike.findMany({
        where: { id: { in: notificationIds }, post: { userId, deletedAt: null } },
        select: { id: true },
      }),
      this.prisma.donationData.findMany({
        where: { id: { in: notificationIds }, vendorId: userId },
        select: { id: true },
      }),
      this.prisma.payment.findMany({
        where: { id: { in: notificationIds }, receiverId: userId, forPayment: 'following', status: 'succeeded' },
        select: { id: true },
      }),
    ]);

    const notifIds = notificationIdsFound.map((n) => n.id);
    const likeIdList = likeIds.map((l) => l.id);
    const donationIdList = donationIds.map((d) => d.id);
    const paymentIdList = paymentIds.map((p) => p.id);

    const [notifUpdate, likeUpdate, donationUpdate, paymentUpdate] = await Promise.all([
      notifIds.length
        ? this.prisma.notification.updateMany({
            where: { id: { in: notifIds }, userId },
            data: { isRead: true },
          })
        : Promise.resolve({ count: 0 }),
      likeIdList.length
        ? this.prisma.postLike.updateMany({
            where: { id: { in: likeIdList } },
            data: { isReadByOwner: true },
          })
        : Promise.resolve({ count: 0 }),
      donationIdList.length
        ? this.prisma.donationData.updateMany({
            where: { id: { in: donationIdList } },
            data: { isReadByOwner: true },
          })
        : Promise.resolve({ count: 0 }),
      paymentIdList.length
        ? this.prisma.payment.updateMany({
            where: { id: { in: paymentIdList } },
            data: { isReadByOwner: true },
          })
        : Promise.resolve({ count: 0 }),
    ]);

    return { total: notifUpdate.count + likeUpdate.count + donationUpdate.count + paymentUpdate.count };
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [notifCount, likeCount, donationCount, paymentCount] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      this.prisma.postLike.count({
        where: { userId: { not: userId }, post: { userId, deletedAt: null }, isReadByOwner: false },
      }),
      this.prisma.donationData.count({
        where: { vendorId: userId, status: 'completed', action: 'missionDonation', isReadByOwner: false },
      }),
      this.prisma.payment.count({
        where: { receiverId: userId, forPayment: 'following', status: 'succeeded', isReadByOwner: false },
      }),
    ]);

    return notifCount + likeCount + donationCount + paymentCount;
  }
}
