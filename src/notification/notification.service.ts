import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) { }

  private getNotificationCategory(data?: Record<string, string>): string | undefined {
    return data?.notificationCategory || data?.category;
  }

  private toHandle(name?: string | null, fallback = 'username'): string {
    const safeName = name?.trim() || fallback;
    return safeName.startsWith('@') ? safeName : `@${safeName}`;
  }

  private truncateText(value?: string | null, maxLength = 100): string {
    const text = value?.trim() || '';
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
  }

  private getDisplayFundedPercent(raisedAmount: number, goalAmount: number): number {
    if (goalAmount <= 0) return 0;
    return Math.min(100, Math.floor((raisedAmount / goalAmount) * 100));
  }

  private extractMentionNames(text?: string | null): string[] {
    const matches = text?.match(/@[\w.]+/g) || [];
    return Array.from(new Set(matches.map((mention) => mention.slice(1).toLowerCase())));
  }

  private formatCompactCount(value: number): string {
    if (value >= 1000000) {
      const millions = value / 1000000;
      return `${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    if (value >= 1000) {
      const thousands = value / 1000;
      return `${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
    }
    return String(value);
  }

  private getDralensTierUpgrade(totalFollowers: number): {
    threshold: number;
    previousTier: string;
    newTier: string;
    newDragonfly: string;
    rangeLabel: string;
  } | null {
    const upgrades = [
      { threshold: 1000, previousTier: 'White', newTier: 'Black', newDragonfly: 'Black Dragonfly', rangeLabel: '1K - 10K' },
      { threshold: 10000, previousTier: 'Black', newTier: 'Silver', newDragonfly: 'Silver Dragonfly', rangeLabel: '10K - 100K' },
      { threshold: 100000, previousTier: 'Silver', newTier: 'Gold', newDragonfly: 'Gold Dragonfly', rangeLabel: '100K - 1M' },
      { threshold: 1000000, previousTier: 'Gold', newTier: 'Purple', newDragonfly: 'Purple Dragonfly', rangeLabel: '1M - 10M' },
      { threshold: 10000000, previousTier: 'Purple', newTier: 'Purple+', newDragonfly: 'Purple Dragonfly', rangeLabel: '10M+' },
    ];

    return upgrades.find((upgrade) => totalFollowers === upgrade.threshold) || null;
  }

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

    const notificationCategory = this.getNotificationCategory(data);
    const payloadData = {
      ...(data || {}),
      title,
      body,
    };
    const message = {
      token: (user as any).fcmToken,
      data: payloadData,
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            'mutable-content': '1',
            'content-available': '1',
            ...(notificationCategory ? { category: notificationCategory } : {}),
          },
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          ...(notificationCategory ? { clickAction: notificationCategory } : {}),
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

    const notificationCategory = this.getNotificationCategory(data);
    const payloadData = {
      ...(data || {}),
      title,
      body,
    };
    const message = {
      tokens,
      data: payloadData,
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            'mutable-content': '1',
            'content-available': '1',
            ...(notificationCategory ? { category: notificationCategory } : {}),
          },
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          ...(notificationCategory ? { clickAction: notificationCategory } : {}),
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
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
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        creatorId: true,
        question: true,
        options: true,
        endTime: true,
        creator: {
          select: {
            id: true,
            userName: true,
            displayName: true,
          },
        },
        participants: {
          select: {
            id: true,
            userId: true,
            side: true,
            openingArgument: true,
          },
        },
      },
    });

    if (!battle) return;

    const inviterName = battle.creator?.userName || battle.creator?.displayName || 'Someone';
    const inviterHandle = inviterName.startsWith('@') ? inviterName : `@${inviterName}`;
    const challengerPosition = battle.participants.find((participant) => participant.userId === battle.creatorId);
    const challengerSide = challengerPosition?.side || battle.options?.[0] || 'Side A';
    const normalizedChallengerSide = challengerSide.trim().toLowerCase();
    const remainingSide =
      battle.options?.find((option) => option.trim().toLowerCase() !== normalizedChallengerSide) ||
      battle.options?.[1] ||
      '';
    const participantCount = battle.participants.length;

    return this.sendNotificationToUser(
      invitedUserId,
      'Battle Invitation',
      `${inviterHandle} challenged you to a Battle. Review their side and argument.`,
      {
        type: 'battle_invite',
        battleId,
        inviterId: battle.creatorId,
        inviterUserName: inviterHandle,
        question: battle.question,
        challengerSide,
        remainingSide,
        challengerArgument: challengerPosition?.openingArgument || '',
        endTime: battle.endTime.toISOString(),
        participantCount: String(participantCount),
        deepLink: `valens://battle/invite/${battle.id}`,
        notificationCategory: 'BATTLE_INVITE',
        expandedTitle: 'BATTLE_INVITE',
        primaryAction: 'ACCEPT_BATTLE',
        secondaryAction: 'DECLINE_BATTLE',
      },
    );
  }

  async sendNewFollower(followingId: string, followerId: string): Promise<void> {
    const [follower, totalFollowers, ownerStats, followerTotalFollowers, followerStats] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: followerId },
        select: { id: true, userName: true, displayName: true, image: true },
      }),
      this.prisma.followerAndFollowing.count({
        where: { followingId, status: 'ACCEPTED' },
      }),
      this.prisma.userBattleStats.findUnique({
        where: { userId: followingId },
        select: { totalPredictionsCorrect: true, totalPredictionsWrong: true },
      }),
      this.prisma.followerAndFollowing.count({
        where: { followingId: followerId, status: 'ACCEPTED' },
      }),
      this.prisma.userBattleStats.findUnique({
        where: { userId: followerId },
        select: { totalPredictionsCorrect: true, totalPredictionsWrong: true },
      }),
    ]);

    const rawUsername = follower?.userName || follower?.displayName || 'username';
    const followerHandle = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

    const getAccuracyRate = (
      stats?: { totalPredictionsCorrect: number; totalPredictionsWrong: number } | null,
    ): number => {
      const predictionTotal = (stats?.totalPredictionsCorrect || 0) + (stats?.totalPredictionsWrong || 0);
      return predictionTotal > 0 ? Math.round(((stats?.totalPredictionsCorrect || 0) / predictionTotal) * 100) : 0;
    };

    return this.sendNotificationToUser(
      followingId,
      '👤 New Follower!',
      `${followerHandle} started following you. Check out their profile.`,
      {
        type: 'follow',
        followerId,
        followingId,
        followerUserName: followerHandle,
        followerDisplayName: follower?.displayName || '',
        followerImage: follower?.image || '',
        notificationCategory: 'NEW_FOLLOWER',
        deepLink: `valens://profile/${followerId}`,
        expandedTitle: 'NEW FOLLOWER',
        expandedBody: `${followerHandle} is now following you`,
        totalFollowers: String(totalFollowers),
        accuracyRate: String(getAccuracyRate(ownerStats)),
        followerTotalFollowers: String(followerTotalFollowers),
        followerAccuracyRate: String(getAccuracyRate(followerStats)),
        primaryAction: 'VIEW_PROFILE',
        secondaryAction: 'FOLLOW_BACK',
      },
    );
  }

  async sendPrivateCircleGrowing(ownerId: string, joinedUserId: string, privateCircleId: string): Promise<void> {
    const [joinedUser, totalMembers, activePosts] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: joinedUserId },
        select: { id: true, userName: true, displayName: true, image: true },
      }),
      this.prisma.privateCircleMember.count({
        where: { privateCircleId, status: 'ACTIVE' },
      }),
      this.prisma.post.count({
        where: {
          privateCircleId,
          deletedAt: null,
          isDelete: 'no',
        },
      }),
    ]);

    if (!joinedUser || ownerId === joinedUserId) return;

    const joinedUserHandle = this.toHandle(joinedUser.userName || joinedUser.displayName);
    const activePostsLabel = `${activePosts} exclusive ${activePosts === 1 ? 'post' : 'posts'}`;

    return this.sendNotificationToUser(
      ownerId,
      '\uD83D\uDC65 Your Circle is growing!',
      `${joinedUserHandle} just joined your Private Circle. You now have ${totalMembers} members.`,
      {
        type: 'private_circle_growing',
        privateCircleId,
        ownerId,
        joinedUserId,
        joinedUserName: joinedUserHandle,
        joinedUserDisplayName: joinedUser.displayName || '',
        joinedUserImage: joinedUser.image || '',
        notificationCategory: 'PRIVATE_CIRCLE_GROWING',
        deepLink: `valens://private-circle/${privateCircleId}`,
        expandedTitle: 'private_circle_growing',
        expandedBody: `${joinedUserHandle} joined your Private Circle!`,
        circleName: 'Private Circle',
        totalMembers: String(totalMembers),
        activePosts: String(activePosts),
        activePostsLabel,
        primaryAction: 'MANAGE_CIRCLE_MEMBERS',
        secondaryAction: 'POST_EXCLUSIVE_CONTENT',
      },
    );
  }

  async sendPrivateCircleAccessRemoved(memberUserId: string, ownerId: string, privateCircleId: string): Promise<void> {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, userName: true, displayName: true, image: true },
    });

    if (!owner || memberUserId === ownerId) return;

    const ownerHandle = this.toHandle(owner.userName || owner.displayName);

    return this.sendNotificationToUser(
      memberUserId,
      '\uD83D\uDD13 Private Circle access removed.',
      `You have been removed from ${ownerHandle}'s Private Circle. Exclusive content is no longer accessible.`,
      {
        type: 'private_circle_access_removed',
        privateCircleId,
        ownerId,
        ownerUserName: ownerHandle,
        ownerDisplayName: owner.displayName || '',
        ownerImage: owner.image || '',
        notificationCategory: 'PRIVATE_CIRCLE_ACCESS_REMOVED',
        deepLink: `valens://profile/${ownerId}`,
        expandedTitle: 'private_circle_access_removed',
        expandedDisplayTitle: 'CIRCLE ACCESS REMOVED',
        expandedBody: `You have been removed from ${ownerHandle}'s Private Circle`,
        accessMessage: 'Exclusive posts from this Circle are no longer visible.',
        publicMessage: 'You can still follow public content.',
        primaryAction: 'VIEW_PROFILE',
      },
    );
  }

  async sendWelcomeOnboarding(userId: string): Promise<void> {
    return this.sendNotificationToUser(
      userId,
      '\uD83D\uDE80 Welcome to Valens!',
      'Your profile is live. Start posting, join Battles, and grow your following today!',
      {
        type: 'welcome_onboarding',
        userId,
        notificationCategory: 'WELCOME_ONBOARDING',
        deepLink: 'valens://home',
        expandedTitle: 'welcome_onboarding',
        expandedDisplayTitle: 'WELCOME TO VALENS',
        expandedBody: 'Your profile is live. Start posting, join Battles, and grow your following today!',
        primaryAction: 'START_EXPLORING',
        secondaryAction: 'CREATE_POST',
      },
    );
  }

  async sendBadgeAchievementUnlockedIfNeeded(userId: string): Promise<void> {
    const [totalFollowers, stats] = await Promise.all([
      this.prisma.followerAndFollowing.count({
        where: { followingId: userId, status: 'ACCEPTED' },
      }),
      this.prisma.userBattleStats.findUnique({
        where: { userId },
        select: {
          totalBattlesWon: true,
          totalPredictionsCorrect: true,
          totalPredictionsWrong: true,
        },
      }),
    ]);

    const tierUpgrade = this.getDralensTierUpgrade(totalFollowers);
    if (!tierUpgrade) return;

    const recentNotifications = await this.prisma.notification.findMany({
      where: { userId },
      select: { data: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const alreadySent = recentNotifications.some((notification) => {
      const data = notification.data as Record<string, string> | null;
      return (
        data?.type === 'badge_achievement_unlocked' &&
        data?.achievementCode === 'dralens_tier_upgrade' &&
        data?.milestoneValue === String(tierUpgrade.threshold)
      );
    });

    if (alreadySent) return;

    const predictionTotal = (stats?.totalPredictionsCorrect || 0) + (stats?.totalPredictionsWrong || 0);
    const accuracyRate = predictionTotal > 0
      ? Math.round(((stats?.totalPredictionsCorrect || 0) / predictionTotal) * 100)
      : 0;
    const milestoneLabel = `${this.formatCompactCount(tierUpgrade.threshold)} Followers`;

    return this.sendNotificationToUser(
      userId,
      '\uD83E\uDD47 New Badge Unlocked!',
      `You reached ${tierUpgrade.threshold.toLocaleString()} followers! Dralens evolved to ${tierUpgrade.newTier} tier. Congrats!`,
      {
        type: 'badge_achievement_unlocked',
        achievementCode: 'dralens_tier_upgrade',
        userId,
        notificationCategory: 'BADGE_ACHIEVEMENT_UNLOCKED',
        deepLink: `valens://profile/${userId}`,
        expandedTitle: 'badge_achievement_unlocked',
        expandedDisplayTitle: 'ACHIEVEMENT UNLOCKED',
        achievementTitle: 'Dralens Tier Upgraded!',
        previousTier: tierUpgrade.previousTier,
        newTier: tierUpgrade.newTier,
        dragonflyName: tierUpgrade.newDragonfly,
        tierRange: tierUpgrade.rangeLabel,
        milestone: milestoneLabel,
        milestoneValue: String(tierUpgrade.threshold),
        totalFollowers: String(totalFollowers),
        accuracyRate: String(accuracyRate),
        battlesWon: String(stats?.totalBattlesWon || 0),
        primaryAction: 'VIEW_PROFILE',
      },
    );
  }

  async sendDropTrendingIfNeeded(postId: string, actorId: string): Promise<void> {
    const milestones = [1, 25, 50, 100, 250, 500, 1000];

    const [post, actor, reactionCount, commentCount] = await Promise.all([
      this.prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
        select: { id: true, userId: true, text: true, caption: true, type: true },
      }),
      this.prisma.user.findUnique({
        where: { id: actorId },
        select: { id: true, userName: true, displayName: true, image: true },
      }),
      this.prisma.postLike.count({ where: { postId } }),
      this.prisma.postComment.count({ where: { postId } }),
    ]);

    if (!post || post.userId === actorId) return;

    const totalInteractions = reactionCount + commentCount;
    const milestone = milestones
      .slice()
      .reverse()
      .find((value) => totalInteractions >= value);

    if (!milestone) return;

    const recentNotifications = await this.prisma.notification.findMany({
      where: { userId: post.userId },
      select: { data: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const alreadySent = recentNotifications.some((notification) => {
      const data = notification.data as Record<string, string> | null;
      return data?.type === 'drop_trending' && data?.postId === postId && data?.milestone === String(milestone);
    });

    if (alreadySent) return;

    const rawUsername = actor?.userName || actor?.displayName || 'username';
    const actorHandle = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    const othersCount = Math.max(0, totalInteractions - 1);
    const actorText = othersCount > 0 ? `${actorHandle} and ${othersCount} others` : actorHandle;
    const dropTitle = (post.caption || post.text || 'Your Drop').trim();
    const displayDropTitle = dropTitle.length > 80 ? `${dropTitle.slice(0, 77)}...` : dropTitle;

    return this.sendNotificationToUser(
      post.userId,
      '\uD83C\uDFAC Your Drop is trending!',
      `${actorText} reacted to your Drop. It's getting traction!`,
      {
        type: 'drop_trending',
        postId,
        creatorId: post.userId,
        actorId,
        actorUserName: actorHandle,
        actorDisplayName: actor?.displayName || '',
        actorImage: actor?.image || '',
        milestone: String(milestone),
        notificationCategory: 'DROP_TRENDING',
        deepLink: `valens://drop/${postId}`,
        expandedTitle: 'DROP TRENDING',
        dropTitle: displayDropTitle,
        reactionCount: String(reactionCount),
        commentCount: String(commentCount),
        totalInteractions: String(totalInteractions),
        views: '0',
        primaryAction: 'VIEW_DROP',
      },
    );
  }

  async sendStoryViewInsightsIfNeeded(storyId: string, viewerId: string): Promise<void> {
    const milestones = [2, 10, 25, 50, 100, 250, 500, 1000];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [story, viewer, viewsLastHour, viewsLast24h, reactionCount] = await Promise.all([
      this.prisma.story.findUnique({
        where: { id: storyId },
        select: { id: true, userId: true, deletedAt: true },
      }),
      this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { id: true, userName: true, displayName: true, image: true },
      }),
      this.prisma.storyView.count({
        where: { storyId, createdAt: { gte: oneHourAgo } },
      }),
      this.prisma.storyView.count({
        where: { storyId, createdAt: { gte: last24Hours } },
      }),
      this.prisma.storyLike.count({ where: { storyId } }),
    ]);

    if (!story || story.deletedAt || story.userId === viewerId) return;

    const milestone = milestones
      .slice()
      .reverse()
      .find((value) => viewsLastHour >= value);

    if (!milestone) return;

    const recentNotifications = await this.prisma.notification.findMany({
      where: { userId: story.userId },
      select: { data: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const alreadySent = recentNotifications.some((notification) => {
      const data = notification.data as Record<string, string> | null;
      return data?.type === 'story_view_insights' && data?.storyId === storyId && data?.milestone === String(milestone);
    });

    if (alreadySent) return;

    const viewerHandle = this.toHandle(viewer?.userName || viewer?.displayName);
    const othersCount = Math.max(0, viewsLastHour - 1);
    const viewerText = othersCount > 0 ? `${viewerHandle} and ${othersCount} others` : viewerHandle;

    return this.sendNotificationToUser(
      story.userId,
      '\uD83D\uDC41 Your Story is Popular!',
      `${viewerText} viewed your Story in the last hour.`,
      {
        type: 'story_view_insights',
        storyId,
        creatorId: story.userId,
        actorId: viewerId,
        actorUserName: viewerHandle,
        actorDisplayName: viewer?.displayName || '',
        actorImage: viewer?.image || '',
        milestone: String(milestone),
        viewersLastHour: String(viewsLastHour),
        viewsLast24h: String(viewsLast24h),
        reactions: String(reactionCount),
        profileVisits: '0',
        notificationCategory: 'STORY_INSIGHTS',
        deepLink: `valens://story/${storyId}`,
        analyticsDeepLink: `valens://story-analytics/${storyId}`,
        expandedTitle: 'STORY INSIGHTS',
        primaryAction: 'VIEW_STORY_ANALYTICS',
      },
    );
  }

  async sendPostCreditLowAlert(userId: string, creditsRemaining: number): Promise<void> {
    return this.sendNotificationToUser(
      userId,
      '\u26A0 1 Post Credit Left',
      'You have 1 post credit remaining. Upgrade to keep posting.',
      {
        type: 'post_credit_low',
        userId,
        creditsRemaining: String(creditsRemaining),
        totalCredits: '5',
        hitPriceUsd: '1.99',
        upgradePriceUsd: '1.99',
        notificationCategory: 'POST_CREDIT_LOW',
        deepLink: 'valens://upgrade',
        expandedTitle: 'LOW POST CREDITS',
        expandedSubtitle: `Credits Remaining: ${creditsRemaining} / 5`,
        expandedBody: 'Upgrade to Valens Pro for $1.99/month',
        primaryAction: 'UPGRADE_NOW',
        secondaryAction: 'CONTINUE_WITH_FREE_PLAN',
      },
    );
  }

  async sendMissionPostLaunchedToFollowers(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        text: true,
        caption: true,
        raiseAmount: true,
        end_time: true,
        type: true,
        user: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!post || !['mission-post', 'crowdfunding', 'support'].includes(post.type || '')) return;

    const followers = await this.prisma.followerAndFollowing.findMany({
      where: { followingId: post.userId, status: 'ACCEPTED' },
      select: { followerId: true },
    });
    const followerIds = followers.map((f) => f.followerId).filter((id) => id !== post.userId);

    if (followerIds.length === 0) return;

    const backersCount = await this.prisma.donationData.count({
      where: {
        postId,
        status: 'completed',
        action: { in: ['missionDonation', 'donate'] },
      },
    });

    const creatorHandle = this.toHandle(post.user?.userName || post.user?.displayName);
    const missionTitle = this.truncateText(post.caption || post.text || 'Mission Post', 120);
    const goal = typeof post.raiseAmount === 'number' ? post.raiseAmount.toFixed(2) : '';
    const deadlineIso = post.end_time ? post.end_time.toISOString() : '';

    return this.sendNotificationToMultipleUsers(
      followerIds,
      `\uD83C\uDFAF ${creatorHandle} launched a Mission!`,
      'They need your support. See the goal and be one of the first backers.',
      {
        type: 'mission_post_launched',
        postId,
        creatorId: post.userId,
        creatorUserName: creatorHandle,
        creatorDisplayName: post.user?.displayName || '',
        creatorImage: post.user?.image || '',
        missionTitle,
        goal,
        deadline: deadlineIso,
        backersCount: String(backersCount),
        platformFeePercent: '5',
        notificationCategory: 'MISSION_POST_LAUNCHED',
        deepLink: `valens://post/${postId}`,
        backMissionDeepLink: `valens://mission/${postId}/back`,
        expandedTitle: 'NEW MISSION POST',
        expandedBody: `${creatorHandle} just launched a Mission`,
        primaryAction: 'BACK_THIS_MISSION',
        secondaryAction: 'VIEW_FULL_POST',
      },
    );
  }

  async sendPrivateCircleExclusivePostPublished(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        text: true,
        caption: true,
        images: true,
        privateCircleId: true,
        visibleTo: true,
        user: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!post || !post.privateCircleId || post.visibleTo !== 'PRIVATE_CIRCLE') return;

    const members = await this.prisma.privateCircleMember.findMany({
      where: {
        privateCircleId: post.privateCircleId,
        status: 'ACTIVE',
        userId: { not: post.userId },
      },
      select: { userId: true },
    });
    const memberIds = members.map((member) => member.userId);

    if (memberIds.length === 0) return;

    const creatorHandle = this.toHandle(post.user?.userName || post.user?.displayName);
    const postText = this.truncateText(post.caption || post.text || 'Exclusive content', 140);
    const mediaUrls = post.images || [];
    const videoCount = mediaUrls.filter((url) => /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(url)).length;
    const pdfCount = mediaUrls.filter((url) => /\.pdf(\?|$)/i.test(url)).length;
    const photoCount = Math.max(mediaUrls.length - videoCount - pdfCount, 0);
    const mediaSummary = [
      videoCount ? `${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}` : '',
      photoCount ? `${photoCount} ${photoCount === 1 ? 'Photo' : 'Photos'}` : '',
      pdfCount ? `${pdfCount} PDF ${pdfCount === 1 ? 'Guide' : 'Guides'}` : '',
    ].filter(Boolean).join(' | ');

    return this.sendNotificationToMultipleUsers(
      memberIds,
      '\uD83D\uDD10 New exclusive post in your Circle!',
      `${creatorHandle} just posted exclusive content for your Private Circle. Only you can see this.`,
      {
        type: 'private_circle_exclusive_post',
        postId,
        privateCircleId: post.privateCircleId,
        creatorId: post.userId,
        creatorUserName: creatorHandle,
        creatorDisplayName: post.user?.displayName || '',
        creatorImage: post.user?.image || '',
        notificationCategory: 'PRIVATE_CIRCLE_EXCLUSIVE_POST',
        deepLink: `valens://post/${postId}`,
        expandedTitle: 'private_circle_exclusive_post',
        expandedDisplayTitle: 'EXCLUSIVE CIRCLE POST',
        expandedSubtitle: 'Only visible to Circle members',
        expandedBody: `${creatorHandle} posted exclusive content.`,
        postPreview: postText,
        mediaSummary,
        videoCount: String(videoCount),
        photoCount: String(photoCount),
        pdfCount: String(pdfCount),
        postedTo: 'Inner Circle — Exclusive Drops',
        membersText: 'Private Circle members only',
        primaryAction: 'VIEW_EXCLUSIVE_POST',
      },
    );
  }

  async sendMissionGoalMilestoneIfNeeded(postId: string): Promise<void> {
    const milestones = [25, 50, 75];

    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        text: true,
        caption: true,
        raiseAmount: true,
        end_time: true,
        type: true,
        user: {
          select: {
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!post || !['mission-post', 'crowdfunding', 'support'].includes(post.type || '') || !post.raiseAmount) return;

    const [raisedResult, backersCount, donors] = await Promise.all([
      this.prisma.donationData.aggregate({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        _sum: { amount: true, totalAmount: true },
      }),
      this.prisma.donationData.count({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
      }),
      this.prisma.donationData.findMany({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        select: { userId: true },
      }),
    ]);

    const raisedAmount = Number(raisedResult._sum.totalAmount ?? raisedResult._sum.amount ?? 0);
    const goalAmount = Number(post.raiseAmount);
    if (goalAmount <= 0) return;

    const fundedPercent = (raisedAmount / goalAmount) * 100;
    const milestone = milestones
      .slice()
      .reverse()
      .find((value) => fundedPercent >= value);

    if (!milestone) return;

    const recentNotifications = await this.prisma.notification.findMany({
      where: { userId: post.userId },
      select: { data: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const sentForMilestone = recentNotifications.some((notification) => {
      const data = notification.data as Record<string, string> | null;
      return data?.type === 'mission_goal_milestone' && data?.postId === postId && data?.milestone === String(milestone);
    });

    if (sentForMilestone) return;

    const recipientIds = Array.from(new Set([post.userId, ...donors.map((donor) => donor.userId)]));
    if (recipientIds.length === 0) return;

    const creatorHandle = this.toHandle(post.user?.userName || post.user?.displayName);
    const missionTitle = this.truncateText(post.caption || post.text || 'Mission Post', 120);
    const raisedLabel = raisedAmount.toFixed(2);
    const goalLabel = goalAmount.toFixed(2);
    const daysLeft = post.end_time
      ? Math.max(0, Math.ceil((post.end_time.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : 0;
    const timeLeftLabel = post.end_time ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}` : '';
    const titleByMilestone: Record<number, string> = {
      25: '\uD83D\uDCC8 Mission is 25% funded!',
      50: '\uD83D\uDD25 Halfway there! Mission is 50% funded.',
      75: '\u26A1 Almost there! Mission is 75% funded.',
    };
    const bodyByMilestone: Record<number, string> = {
      25: `${creatorHandle}'s campaign just hit its first milestone. Help push it further!`,
      50: `${creatorHandle}'s campaign is gaining momentum. Share it with your network!`,
      75: `Just 25% to go on ${creatorHandle}'s Mission. One last push makes the difference.`,
    };

    return this.sendNotificationToMultipleUsers(
      recipientIds,
      titleByMilestone[milestone],
      bodyByMilestone[milestone],
      {
        type: 'mission_goal_milestone',
        postId,
        creatorId: post.userId,
        creatorUserName: creatorHandle,
        creatorDisplayName: post.user?.displayName || '',
        creatorImage: post.user?.image || '',
        milestone: String(milestone),
        fundedPercent: String(milestone),
        missionTitle,
        raised: raisedLabel,
        goal: goalLabel,
        backersCount: String(backersCount),
        timeLeft: timeLeftLabel,
        notificationCategory: 'MISSION_GOAL_MILESTONE',
        deepLink: `valens://post/${postId}`,
        backMissionDeepLink: `valens://mission/${postId}/back`,
        expandedTitle: 'MISSION MILESTONE',
        expandedSubtitle: `${milestone}% Funded!`,
        primaryAction: 'BACK_THIS_MISSION',
        secondaryAction: 'SHARE',
      },
    );
  }

  async sendNewMissionBackerNotification(donationId: string): Promise<void> {
    const donation = await this.prisma.donationData.findUnique({
      where: { id: donationId },
      select: {
        id: true,
        userId: true,
        vendorId: true,
        postId: true,
        amount: true,
        totalAmount: true,
        status: true,
        action: true,
        user: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!donation || donation.status !== 'completed' || donation.action !== 'missionDonation' || !donation.postId || !donation.vendorId) {
      return;
    }

    const [post, raisedResult, backersCount] = await Promise.all([
      this.prisma.post.findUnique({
        where: { id: donation.postId, deletedAt: null },
        select: {
          id: true,
          userId: true,
          text: true,
          caption: true,
          raiseAmount: true,
          end_time: true,
          type: true,
        },
      }),
      this.prisma.donationData.aggregate({
        where: {
          postId: donation.postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        _sum: { amount: true, totalAmount: true },
      }),
      this.prisma.donationData.count({
        where: {
          postId: donation.postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
      }),
    ]);

    if (!post || post.userId !== donation.vendorId || !['mission-post', 'crowdfunding', 'support'].includes(post.type || '')) {
      return;
    }

    const backerHandle = this.toHandle(donation.user?.userName || donation.user?.displayName);
    const raisedAmount = Number(raisedResult._sum.totalAmount ?? raisedResult._sum.amount ?? 0);
    const goalAmount = Number(post.raiseAmount || 0);
    const fundedPercent = this.getDisplayFundedPercent(raisedAmount, goalAmount);
    const missionTitle = this.truncateText(post.caption || post.text || 'Mission Post', 120);
    const daysLeft = post.end_time
      ? Math.max(0, Math.ceil((post.end_time.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : 0;
    const timeLeftLabel = post.end_time ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}` : '';

    return this.sendNotificationToUser(
      donation.vendorId,
      '\uD83C\uDFE6 New Backer on your Mission!',
      `${backerHandle} contributed $${donation.amount} to your Mission. You're now ${fundedPercent}% funded!`,
      {
        type: 'mission_new_backer',
        donationId: donation.id,
        postId: donation.postId,
        creatorId: donation.vendorId,
        backerId: donation.userId,
        backerUserName: backerHandle,
        backerDisplayName: donation.user?.displayName || '',
        backerImage: donation.user?.image || '',
        contribution: donation.amount.toFixed(2),
        totalRaised: raisedAmount.toFixed(2),
        goal: goalAmount.toFixed(2),
        fundedPercent: String(fundedPercent),
        backersCount: String(backersCount),
        timeLeft: timeLeftLabel,
        missionTitle,
        notificationCategory: 'MISSION_NEW_BACKER',
        deepLink: `valens://post/${donation.postId}`,
        expandedTitle: 'NEW BACKER',
        expandedBody: `${backerHandle} backed your Mission!`,
        primaryAction: 'VIEW_YOUR_MISSION',
        secondaryAction: 'SEND_THANKS',
      },
    );
  }

  async sendMissionFullyFundedIfNeeded(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        text: true,
        caption: true,
        raiseAmount: true,
        type: true,
        user: {
          select: {
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!post || !['mission-post', 'crowdfunding', 'support'].includes(post.type || '') || !post.raiseAmount) return;

    const [raisedResult, backersCount, donors, recentNotifications] = await Promise.all([
      this.prisma.donationData.aggregate({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        _sum: { amount: true, totalAmount: true },
      }),
      this.prisma.donationData.count({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
      }),
      this.prisma.donationData.findMany({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        select: { userId: true },
      }),
      this.prisma.notification.findMany({
        where: { userId: post.userId },
        select: { data: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const raisedAmount = Number(raisedResult._sum.totalAmount ?? raisedResult._sum.amount ?? 0);
    const goalAmount = Number(post.raiseAmount);
    if (goalAmount <= 0 || raisedAmount < goalAmount) return;

    const alreadySent = recentNotifications.some((notification) => {
      const data = notification.data as Record<string, string> | null;
      return data?.type === 'mission_fully_funded' && data?.postId === postId;
    });
    if (alreadySent) return;

    const creatorHandle = this.toHandle(post.user?.userName || post.user?.displayName);
    const missionTitle = this.truncateText(post.caption || post.text || 'Mission Post', 120);
    const raisedLabel = raisedAmount.toFixed(2);
    const goalLabel = goalAmount.toFixed(2);
    const commonData = {
      type: 'mission_fully_funded',
      postId,
      creatorId: post.userId,
      creatorUserName: creatorHandle,
      creatorDisplayName: post.user?.displayName || '',
      creatorImage: post.user?.image || '',
      missionTitle,
      raised: raisedLabel,
      goal: goalLabel,
      fundedPercent: '100',
      backersCount: String(backersCount),
      notificationCategory: 'MISSION_FULLY_FUNDED',
      deepLink: `valens://post/${postId}`,
      expandedTitle: 'MISSION COMPLETE!',
      expandedSubtitle: 'Goal Fully Reached!',
      primaryAction: 'VIEW_MISSION_SUMMARY',
    };

    await this.sendNotificationToUser(
      post.userId,
      '\uD83C\uDF89 Your Mission is FULLY FUNDED!',
      `Congratulations! Your campaign hit the $${goalLabel} goal. Payout is being processed.`,
      {
        ...commonData,
        audience: 'creator',
      },
    );

    const backerIds = Array.from(new Set(donors.map((donor) => donor.userId).filter((userId) => userId !== post.userId)));
    if (backerIds.length === 0) return;

    return this.sendNotificationToMultipleUsers(
      backerIds,
      '\uD83C\uDF89 Mission Fully Funded!',
      `${creatorHandle}'s Mission reached its goal! You helped make it happen. Thank you.`,
      {
        ...commonData,
        audience: 'backer',
      },
    );
  }

  async sendMissionEndingSoonIfNeeded(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        text: true,
        caption: true,
        raiseAmount: true,
        end_time: true,
        type: true,
        user: {
          select: {
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!post || !['mission-post', 'crowdfunding', 'support'].includes(post.type || '') || !post.end_time) return;

    const remainingMs = post.end_time.getTime() - Date.now();
    if (remainingMs <= 0 || remainingMs > 24 * 60 * 60 * 1000) return;

    const recentNotifications = await this.prisma.notification.findMany({
      where: { userId: post.userId },
      select: { data: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const alreadySent = recentNotifications.some((notification) => {
      const data = notification.data as Record<string, string> | null;
      return data?.type === 'mission_ending_soon' && data?.postId === postId;
    });
    if (alreadySent) return;

    const [raisedResult, backersCount, followers, donors] = await Promise.all([
      this.prisma.donationData.aggregate({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        _sum: { amount: true, totalAmount: true },
      }),
      this.prisma.donationData.count({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
      }),
      this.prisma.followerAndFollowing.findMany({
        where: { followingId: post.userId, status: 'ACCEPTED' },
        select: { followerId: true },
      }),
      this.prisma.donationData.findMany({
        where: {
          postId,
          status: 'completed',
          action: { in: ['missionDonation', 'donate'] },
        },
        select: { userId: true },
      }),
    ]);

    const recipientIds = Array.from(
      new Set([
        post.userId,
        ...followers.map((follower) => follower.followerId),
        ...donors.map((donor) => donor.userId),
      ]),
    );
    if (recipientIds.length === 0) return;

    const creatorHandle = this.toHandle(post.user?.userName || post.user?.displayName);
    const missionTitle = this.truncateText(post.caption || post.text || 'Mission Post', 120);
    const raisedAmount = Number(raisedResult._sum.totalAmount ?? raisedResult._sum.amount ?? 0);
    const goalAmount = Number(post.raiseAmount || 0);
    const fundedPercent = this.getDisplayFundedPercent(raisedAmount, goalAmount);
    const stillNeeded = Math.max(0, goalAmount - raisedAmount);
    const hoursLeft = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));

    return this.sendNotificationToMultipleUsers(
      recipientIds,
      '\u23F0 Mission ends in 24 hours!',
      `${creatorHandle}'s campaign closes tomorrow. Don't miss your chance to back it.`,
      {
        type: 'mission_ending_soon',
        postId,
        creatorId: post.userId,
        creatorUserName: creatorHandle,
        creatorDisplayName: post.user?.displayName || '',
        creatorImage: post.user?.image || '',
        missionTitle,
        raised: raisedAmount.toFixed(2),
        goal: goalAmount.toFixed(2),
        fundedPercent: String(fundedPercent),
        stillNeeded: stillNeeded.toFixed(2),
        backersCount: String(backersCount),
        hoursLeft: String(hoursLeft),
        notificationCategory: 'MISSION_ENDING_SOON',
        deepLink: `valens://post/${postId}`,
        backMissionDeepLink: `valens://mission/${postId}/back`,
        expandedTitle: 'LAST CHANCE',
        expandedSubtitle: 'Mission ends in 24 hours',
        primaryAction: 'BACK_THIS_MISSION_NOW',
        secondaryAction: 'SHARE',
      },
    );
  }

  async sendMissionContributionConfirmed(donationId: string): Promise<void> {
    const donation = await this.prisma.donationData.findUnique({
      where: { id: donationId },
      select: {
        id: true,
        userId: true,
        vendorId: true,
        postId: true,
        amount: true,
        totalAmount: true,
        status: true,
        action: true,
      },
    });

    if (!donation || donation.status !== 'completed' || donation.action !== 'missionDonation' || !donation.postId || !donation.vendorId) {
      return;
    }

    const post = await this.prisma.post.findUnique({
      where: { id: donation.postId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        text: true,
        caption: true,
        type: true,
        user: {
          select: {
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!post || post.userId !== donation.vendorId || !['mission-post', 'crowdfunding', 'support'].includes(post.type || '')) {
      return;
    }

    const creatorHandle = this.toHandle(post.user?.userName || post.user?.displayName);
    const missionTitle = this.truncateText(post.caption || post.text || 'Mission Post', 120);
    const amountPaid = Number(donation.totalAmount ?? donation.amount);

    return this.sendNotificationToUser(
      donation.userId,
      '\u2705 Contribution Confirmed!',
      `Your $${amountPaid} backing of ${creatorHandle}'s Mission is confirmed. Thank you for your support!`,
      {
        type: 'mission_contribution_confirmed',
        donationId: donation.id,
        postId: donation.postId,
        creatorId: donation.vendorId,
        creatorUserName: creatorHandle,
        creatorDisplayName: post.user?.displayName || '',
        creatorImage: post.user?.image || '',
        missionTitle,
        amountPaid: amountPaid.toFixed(2),
        paymentVia: 'Stripe',
        notificationCategory: 'MISSION_CONTRIBUTION_CONFIRMED',
        deepLink: `valens://post/${donation.postId}`,
        expandedTitle: 'CONTRIBUTION CONFIRMED',
        expandedBody: 'Your backing was successful!',
        primaryAction: 'VIEW_MISSION_PROGRESS',
        secondaryAction: 'SHARE',
      },
    );
  }

  async sendPostCommentNotification(postId: string, commentId: string, commenterId: string): Promise<void> {
    const [post, comment, commenter] = await Promise.all([
      this.prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
        select: { id: true, userId: true, text: true, caption: true },
      }),
      this.prisma.postComment.findUnique({
        where: { id: commentId },
        select: { id: true, comment: true },
      }),
      this.prisma.user.findUnique({
        where: { id: commenterId },
        select: { id: true, userName: true, displayName: true, image: true },
      }),
    ]);

    if (!post || !comment || post.userId === commenterId) return;

    const commenterHandle = this.toHandle(commenter?.userName || commenter?.displayName);
    const commentPreview = this.truncateText(comment.comment, 90);
    const postTitle = this.truncateText(post.caption || post.text || 'Your post', 80);

    return this.sendNotificationToUser(
      post.userId,
      '\uD83D\uDCAC New Comment',
      `${commenterHandle} commented on your post: "${commentPreview}"`,
      {
        type: 'post_comment',
        postId,
        commentId,
        commenterId,
        commenterUserName: commenterHandle,
        commenterDisplayName: commenter?.displayName || '',
        commenterImage: commenter?.image || '',
        notificationCategory: 'NEW_COMMENT',
        deepLink: `valens://post/${postId}`,
        expandedTitle: 'NEW COMMENT',
        expandedBody: `${commenterHandle} commented on your post:`,
        commentPreview,
        postTitle,
        primaryAction: 'REPLY',
        secondaryAction: 'VIEW_POST',
      },
    );
  }

  async sendPostMentionNotifications(postId: string, commentId: string, mentionerId: string): Promise<void> {
    const [post, comment, mentioner] = await Promise.all([
      this.prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
        select: { id: true, text: true, caption: true },
      }),
      this.prisma.postComment.findUnique({
        where: { id: commentId },
        select: { id: true, comment: true },
      }),
      this.prisma.user.findUnique({
        where: { id: mentionerId },
        select: { id: true, userName: true, displayName: true, image: true },
      }),
    ]);

    if (!post || !comment) return;

    const mentionNames = this.extractMentionNames(comment.comment);
    if (mentionNames.length === 0) return;

    const mentionedUsers = await this.prisma.user.findMany({
      where: {
        OR: mentionNames.flatMap((name) => [
          { userName: { equals: name, mode: 'insensitive' } },
          { displayName: { equals: name, mode: 'insensitive' } },
        ]),
      },
      select: { id: true },
    });

    const recipientIds = Array.from(new Set(mentionedUsers.map((user) => user.id))).filter((id) => id !== mentionerId);
    if (recipientIds.length === 0) return;

    const mentionerHandle = this.toHandle(mentioner?.userName || mentioner?.displayName);
    const postTitle = this.truncateText(post.caption || post.text || 'this post', 80);

    await Promise.all(
      recipientIds.map((recipientId) =>
        this.sendNotificationToUser(
          recipientId,
          '\uD83D\uDCE3 You were mentioned!',
          `${mentionerHandle} mentioned you in a post. Tap to see the context.`,
          {
            type: 'mention',
            contextType: 'post',
            postId,
            commentId,
            mentionerId,
            mentionerUserName: mentionerHandle,
            mentionerDisplayName: mentioner?.displayName || '',
            mentionerImage: mentioner?.image || '',
            notificationCategory: 'MENTION',
            deepLink: `valens://post/${postId}`,
            expandedTitle: 'YOU WERE MENTIONED',
            expandedBody: `${mentionerHandle} mentioned you in a post.`,
            postTitle,
            primaryAction: 'VIEW_CONTEXT',
          },
        ),
      ),
    );
  }

  async sendBattleMentionNotifications(battleId: string, commentId: string, mentionerId: string): Promise<void> {
    const [battle, comment, mentioner] = await Promise.all([
      this.prisma.battle.findUnique({
        where: { id: battleId },
        select: { id: true, question: true },
      }),
      this.prisma.battleComment.findUnique({
        where: { id: commentId },
        select: { id: true, comment: true },
      }),
      this.prisma.user.findUnique({
        where: { id: mentionerId },
        select: { id: true, userName: true, displayName: true, image: true },
      }),
    ]);

    if (!battle || !comment) return;

    const mentionNames = this.extractMentionNames(comment.comment);
    if (mentionNames.length === 0) return;

    const mentionedUsers = await this.prisma.user.findMany({
      where: {
        OR: mentionNames.flatMap((name) => [
          { userName: { equals: name, mode: 'insensitive' } },
          { displayName: { equals: name, mode: 'insensitive' } },
        ]),
      },
      select: { id: true },
    });

    const recipientIds = Array.from(new Set(mentionedUsers.map((user) => user.id))).filter((id) => id !== mentionerId);
    if (recipientIds.length === 0) return;

    const mentionerHandle = this.toHandle(mentioner?.userName || mentioner?.displayName);
    const battleTitle = this.truncateText(battle.question, 80);

    await Promise.all(
      recipientIds.map((recipientId) =>
        this.sendNotificationToUser(
          recipientId,
          '\uD83D\uDCE3 You were mentioned!',
          `${mentionerHandle} mentioned you in a Battle post. Tap to see the context.`,
          {
            type: 'mention',
            contextType: 'battle',
            battleId,
            commentId,
            mentionerId,
            mentionerUserName: mentionerHandle,
            mentionerDisplayName: mentioner?.displayName || '',
            mentionerImage: mentioner?.image || '',
            notificationCategory: 'MENTION',
            deepLink: `valens://battle/${battleId}`,
            expandedTitle: 'YOU WERE MENTIONED',
            expandedBody: `${mentionerHandle} mentioned you in a Battle post.`,
            battleTitle,
            primaryAction: 'VIEW_CONTEXT',
          },
        ),
      ),
    );
  }

  async sendBattleStarted(userId: string, battleId: string): Promise<void> {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        question: true,
        options: true,
        endTime: true,
        participants: {
          select: {
            side: true,
          },
        },
      },
    });

    const sideACount = battle?.participants.filter((participant) => participant.side === 'A').length ?? 0;
    const sideBCount = battle?.participants.filter((participant) => participant.side === 'B').length ?? 0;

    return this.sendNotificationToUser(
      userId,
      '⚔️ Battle Started',
      'The debate is live. See who joins your side.',
      {
        type: 'battle_started',
        battleId,
        notificationCategory: 'BATTLE_STARTED',
        deepLink: `valens://battle/${battleId}`,
        expandedTitle: 'BATTLE LIVE',
        question: battle?.question || '',
        sideALabel: battle?.options?.[0] || 'Side A',
        sideBLabel: battle?.options?.[1] || 'Side B',
        sideACount: String(sideACount),
        sideBCount: String(sideBCount),
        endTime: battle?.endTime?.toISOString() || '',
        primaryAction: 'VIEW_DISCUSSION',
      },
    );
  }

  async sendBattleNewParticipants(userIds: string[], battleId: string, newCount: number): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    const safeNewCount = Number.isFinite(newCount) && newCount > 0 ? Math.floor(newCount) : 1;

    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        options: true,
        participants: {
          select: {
            side: true,
          },
        },
      },
    });

    const sideACount = battle?.participants.filter((participant) => participant.side === 'A').length ?? 0;
    const sideBCount = battle?.participants.filter((participant) => participant.side === 'B').length ?? 0;

    return this.sendNotificationToMultipleUsers(
      userIds,
      '👥 New Participants!',
      `${safeNewCount} new participants joined your Battle. See which side the community is backing.`,
      {
        type: 'battle_participant_joined',
        battleId,
        newCount: String(safeNewCount),
        notificationCategory: 'BATTLE_PARTICIPANT_JOINED',
        deepLink: `valens://battle/${battleId}`,
        expandedTitle: 'BATTLE ACTIVITY',
        activityText: `${safeNewCount} new participants joined`,
        sideALabel: battle?.options?.[0] || 'Agree with Forecast',
        sideBLabel: battle?.options?.[1] || 'Challenge Forecast',
        sideACount: String(sideACount),
        sideBCount: String(sideBCount),
        primaryAction: 'VIEW_BATTLE',
      },
    );
  }

  async sendBattleClosingSoon(userIds: string[], battleId: string): Promise<void> {
    if (!userIds || userIds.length === 0) return;

    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        options: true,
        endTime: true,
        participants: {
          select: {
            side: true,
          },
        },
      },
    });

    const sideACount = battle?.participants.filter((participant) => participant.side === 'A').length ?? 0;
    const sideBCount = battle?.participants.filter((participant) => participant.side === 'B').length ?? 0;
    const remainingMs = battle?.endTime ? battle.endTime.getTime() - Date.now() : 0;
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
    const remainingHours = Math.max(0, Math.ceil(remainingMinutes / 60));
    const timeRemainingLabel = remainingHours >= 1
      ? `${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`
      : `${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;

    return this.sendNotificationToMultipleUsers(
      userIds,
      '⏳ Battle Closing Soon',
      'Final votes are coming in. See the current outcome before time runs out.',
      {
        type: 'battle_closing_soon',
        battleId,
        notificationCategory: 'BATTLE_CLOSING_SOON',
        deepLink: `valens://battle/${battleId}`,
        expandedTitle: 'BATTLE ENDING SOON',
        timeRemaining: timeRemainingLabel,
        sideALabel: battle?.options?.[0] || 'Agree with Forecast',
        sideBLabel: battle?.options?.[1] || 'Challenge Forecast',
        sideACount: String(sideACount),
        sideBCount: String(sideBCount),
        accuracyText: 'Accuracy impact pending.',
        primaryAction: 'VIEW_BATTLE',
      },
    );
  }

  async sendBattleCompleted(userIds: string[], battleId: string): Promise<void> {
    if (!userIds || userIds.length === 0) return;

    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        question: true,
        options: true,
        winningSide: true,
        correctSide: true,
        participants: {
          select: {
            side: true,
          },
        },
        votes: {
          select: {
            side: true,
          },
        },
      },
    });

    const resultEntries = battle?.votes.length ? battle.votes : battle?.participants || [];
    const sideACount = resultEntries.filter((entry) => entry.side === 'A').length;
    const sideBCount = resultEntries.filter((entry) => entry.side === 'B').length;
    const winningSide = battle?.winningSide || battle?.correctSide || '';
    const winningSideLabel = winningSide === 'A'
      ? battle?.options?.[0] || 'Agree with Forecast'
      : winningSide === 'B'
        ? battle?.options?.[1] || 'Challenge Forecast'
        : '';

    return this.sendNotificationToMultipleUsers(
      userIds,
      '🏆 Battle Completed',
      'See the final outcome and accuracy result for your Battle.',
      {
        type: 'battle_completed',
        battleId,
        notificationCategory: 'BATTLE_COMPLETED',
        deepLink: `valens://battle/${battleId}`,
        expandedTitle: 'BATTLE RESULT',
        question: battle?.question || '',
        winningSide,
        winningSideLabel,
        sideALabel: battle?.options?.[0] || 'Agree with Forecast',
        sideBLabel: battle?.options?.[1] || 'Challenge Forecast',
        sideACount: String(sideACount),
        sideBCount: String(sideBCount),
        accuracyText: 'Accuracy Score Updated',
        primaryAction: 'VIEW_ACHIEVEMENTS',
      },
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

    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        options: true,
        winningSide: true,
        correctSide: true,
        participants: {
          where: {
            userId: { in: userIds },
          },
          select: {
            userId: true,
            side: true,
            score: true,
          },
        },
      },
    });

    const userStats = await this.prisma.userBattleStats.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        totalBattlesJoined: true,
        totalBattlesWon: true,
        totalPredictionsCorrect: true,
        totalPredictionsWrong: true,
      },
    });

    const participantMap = new Map(battle?.participants.map((participant) => [participant.userId, participant]) || []);
    const statsMap = new Map(userStats.map((stats) => [stats.userId, stats]));
    const winningSide = battle?.winningSide || battle?.correctSide || '';
    const winningSideLabel = winningSide === 'A'
      ? battle?.options?.[0] || 'Agree with Forecast'
      : winningSide === 'B'
        ? battle?.options?.[1] || 'Challenge Forecast'
        : 'the winning side';

    await Promise.all(
      userIds.map((userId) => {
        const participant = participantMap.get(userId);
        const stats = statsMap.get(userId);
        const predictionTotal = (stats?.totalPredictionsCorrect || 0) + (stats?.totalPredictionsWrong || 0);
        const accuracyRate = predictionTotal > 0
          ? Math.round(((stats?.totalPredictionsCorrect || 0) / predictionTotal) * 100)
          : stats?.totalBattlesJoined
            ? Math.round(((stats.totalBattlesWon || 0) / stats.totalBattlesJoined) * 100)
            : 0;

        return this.sendNotificationToUser(
          userId,
          'Victory! Your side won!',
          'Your credibility score has increased. Check your updated achievements.',
          {
            type: 'battle_victory',
            battleId,
            notificationCategory: 'BATTLE_VICTORY',
            deepLink: `valens://battle/${battleId}/achievements`,
            expandedTitle: 'VICTORY!',
            resultText: 'You chose the winning side.',
            winningSide,
            winningSideLabel,
            userSide: participant?.side || winningSide,
            credibilityGain: String(participant?.score ?? 25),
            accuracyRate: String(accuracyRate),
            badgeText: 'Badges Progress Updated',
            primaryAction: 'VIEW_ACHIEVEMENTS',
          },
        );
      }),
    );
  }

  async sendBattleForecastMissed(userIds: string[], battleId: string): Promise<void> {
    if (!userIds || userIds.length === 0) return;

    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        winningSide: true,
        correctSide: true,
        participants: {
          where: {
            userId: { in: userIds },
          },
          select: {
            userId: true,
            loserPenalty: true,
          },
        },
      },
    });

    const userStats = await this.prisma.userBattleStats.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        totalBattlesJoined: true,
        totalBattlesWon: true,
        totalPredictionsCorrect: true,
        totalPredictionsWrong: true,
      },
    });

    const participantMap = new Map(battle?.participants.map((participant) => [participant.userId, participant]) || []);
    const statsMap = new Map(userStats.map((stats) => [stats.userId, stats]));
    const winningSide = battle?.winningSide || battle?.correctSide || '';

    await Promise.all(
      userIds.map((userId) => {
        const participant = participantMap.get(userId);
        const stats = statsMap.get(userId);
        const predictionTotal = (stats?.totalPredictionsCorrect || 0) + (stats?.totalPredictionsWrong || 0);
        const accuracyRate = predictionTotal > 0
          ? Math.round(((stats?.totalPredictionsCorrect || 0) / predictionTotal) * 100)
          : stats?.totalBattlesJoined
            ? Math.round(((stats.totalBattlesWon || 0) / stats.totalBattlesJoined) * 100)
            : 0;
        const credibilityPenalty = participant?.loserPenalty || 10;

        return this.sendNotificationToUser(
          userId,
          'Battle Result Updated',
          'The outcome did not match your forecast. Review your accuracy.',
          {
            type: 'battle_forecast_missed',
            battleId,
            notificationCategory: 'BATTLE_FORECAST_MISSED',
            deepLink: 'valens://battle/create',
            expandedTitle: 'LOSS',
            resultText: 'Your side did not win this Battle.',
            winningSide,
            credibilityPenalty: String(credibilityPenalty),
            accuracyRate: String(accuracyRate),
            encouragementText: 'Keep forecasting to improve your rank.',
            primaryAction: 'START_NEW_BATTLE',
          },
        );
      }),
    );
  }

  async sendBattleLeaderboardClimbed(userIds: string[], battleId: string): Promise<void> {
    if (!userIds || userIds.length === 0) return;

    const userStats = await this.prisma.userBattleStats.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        totalBattlePoints: true,
        totalBattlesWon: true,
        totalPredictionsCorrect: true,
        totalPredictionsWrong: true,
      },
    });

    const statsMap = new Map(userStats.map((stats) => [stats.userId, stats]));

    await Promise.all(
      userIds.map(async (userId) => {
        const stats = statsMap.get(userId);
        const totalBattlePoints = stats?.totalBattlePoints || 0;
        const predictionTotal = (stats?.totalPredictionsCorrect || 0) + (stats?.totalPredictionsWrong || 0);
        const accuracyRate = predictionTotal > 0
          ? Math.round(((stats?.totalPredictionsCorrect || 0) / predictionTotal) * 100)
          : 0;
        const globalRank = totalBattlePoints > 0
          ? await this.prisma.userBattleStats.count({
            where: {
              totalBattlePoints: { gt: totalBattlePoints },
            },
          }) + 1
          : 0;

        return this.sendNotificationToUser(
          userId,
          'You moved up the leaderboard!',
          'See your new global ranking as a Forecaster on Valens.',
          {
            type: 'battle_leaderboard_climbed',
            battleId,
            notificationCategory: 'BATTLE_LEADERBOARD_CLIMBED',
            deepLink: 'valens://battle/leaderboard',
            expandedTitle: 'RANK UPDATE',
            positionLabel: globalRank > 0 ? `#${globalRank} Global Forecaster` : 'Global Forecaster',
            globalRank: String(globalRank),
            accuracyRate: String(accuracyRate),
            battlesWon: String(stats?.totalBattlesWon || 0),
            totalBattlePoints: String(totalBattlePoints),
            primaryAction: 'VIEW_LEADERBOARD',
          },
        );
      }),
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
