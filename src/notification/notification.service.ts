import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
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
}