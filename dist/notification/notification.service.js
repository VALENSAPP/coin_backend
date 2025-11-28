"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const admin = require("firebase-admin");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationService = class NotificationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendNotificationToUser(userId, title, body, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true },
        });
        if (!user?.fcmToken) {
            console.log(`No FCM token found for user ${userId}`);
            return;
        }
        const message = {
            token: user.fcmToken,
            notification: {
                title,
                body,
            },
            data: data || {},
        };
        try {
            const response = await admin.messaging().send(message);
            console.log('Successfully sent message:', response);
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    }
    async sendNotificationToMultipleUsers(userIds, title, body, data) {
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fcmToken: true },
        });
        const tokens = users
            .filter((user) => user.fcmToken)
            .map((user) => user.fcmToken);
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
        }
        catch (error) {
            console.error('Error sending messages:', error);
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map