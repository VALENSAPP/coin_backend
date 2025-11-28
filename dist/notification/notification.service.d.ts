import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationService {
    private prisma;
    constructor(prisma: PrismaService);
    sendNotificationToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
    sendNotificationToMultipleUsers(userIds: string[], title: string, body: string, data?: Record<string, string>): Promise<void>;
}
