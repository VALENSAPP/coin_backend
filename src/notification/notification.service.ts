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

  // Likes on the current user's posts (computed, not stored in Notification table)
  async getLikePostNotifications(userId: string, limit: number = 100): Promise<any[]> {
    const likes = await this.prisma.postLike.findMany({
      where: {
        post: {
          userId,
          deletedAt: null,
        },
      },
      include: {
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
      isRead: false,
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
        isRead: false,
        createdAt: donation.createdAt,
        updatedAt: donation.createdAt,
      };
    });
  }

  async getNotificationById(notificationId: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
  }

  async markNotificationAsRead(notificationIds: string[]): Promise<void> {
    if (!notificationIds || notificationIds.length === 0) {
      return;
    }
    
    await this.prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
