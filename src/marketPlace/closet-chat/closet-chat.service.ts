import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ClosetChatMessageEventType, ClosetChatMessageType, ClosetChatThreadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClosetChatService {
    constructor(private readonly prisma: PrismaService) { }

    private async assertThreadParticipant(threadId: string, userId: string) {
        const thread = await this.prisma.closetChatThread.findUnique({
            where: { id: threadId },
            select: {
                id: true,
                buyerId: true,
                sellerId: true,
                status: true,
            },
        });

        if (!thread) throw new NotFoundException('Closet chat thread not found');
        if (thread.buyerId !== userId && thread.sellerId !== userId) {
            throw new UnauthorizedException('Unauthorized');
        }

        return thread;
    }

    async getMyThreads(userId: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');

        const threads = await this.prisma.closetChatThread.findMany({
            where: {
                OR: [{ buyerId: userId }, { sellerId: userId }],
            },
            include: {
                buyer: {
                    select: { id: true, displayName: true, image: true, profile: true, profileStatus: true },
                },
                seller: {
                    select: { id: true, displayName: true, image: true, profile: true, profileStatus: true },
                },
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        orderStatus: true,
                        paymentStatus: true,
                        createdAt: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        type: true,
                        eventType: true,
                        senderId: true,
                        receiverId: true,
                        isSeen: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        });

        const threadIds = threads.map((thread) => thread.id);
        const unreadByThread = threadIds.length
            ? await this.prisma.closetChatMessage.groupBy({
                by: ['threadId'],
                where: {
                    threadId: { in: threadIds },
                    receiverId: userId,
                    isSeen: false,
                },
                _count: { _all: true },
            })
            : [];

        const unreadMap = new Map(unreadByThread.map((row) => [row.threadId, row._count._all]));

        return threads.map((thread) => {
            const lastMessage = thread.messages[0] || null;
            const otherUser = thread.buyerId === userId ? thread.seller : thread.buyer;

            return {
                id: thread.id,
                orderId: thread.orderId,
                closetId: thread.closetId,
                status: thread.status,
                createdAt: thread.createdAt,
                updatedAt: thread.updatedAt,
                lastMessageAt: thread.lastMessageAt,
                otherUser,
                order: thread.order,
                unreadCount: unreadMap.get(thread.id) || 0,
                lastMessage,
            };
        });
    }

    async getThreadMessages(userId: string, threadId: string, page = 1, limit = 20) {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        if (!threadId) throw new BadRequestException('threadId is required');

        await this.assertThreadParticipant(threadId, userId);

        const safePage = Math.max(page, 1);
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const skip = (safePage - 1) * safeLimit;

        const [total, messages] = await Promise.all([
            this.prisma.closetChatMessage.count({ where: { threadId } }),
            this.prisma.closetChatMessage.findMany({
                where: { threadId },
                include: {
                    sender: { select: { id: true, displayName: true, image: true } },
                    receiver: { select: { id: true, displayName: true, image: true } },
                },
                orderBy: { createdAt: 'asc' },
                skip,
                take: safeLimit,
            }),
        ]);

        return {
            threadId,
            page: safePage,
            limit: safeLimit,
            total,
            messages,
        };
    }

    async sendMessage(userId: string, threadId: string, content: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        if (!threadId) throw new BadRequestException('threadId is required');
        if (!content || !content.trim()) throw new BadRequestException('Message required');

        const thread = await this.assertThreadParticipant(threadId, userId);
        if (thread.status === ClosetChatThreadStatus.CLOSED) {
            throw new BadRequestException('Chat thread is closed');
        }

        const receiverId = thread.buyerId === userId ? thread.sellerId : thread.buyerId;
        const text = content.trim();

        return this.prisma.$transaction(async (tx) => {
            const message = await tx.closetChatMessage.create({
                data: {
                    threadId,
                    senderId: userId,
                    receiverId,
                    content: text,
                    type: ClosetChatMessageType.USER,
                },
            });

            await tx.closetChatThread.update({
                where: { id: threadId },
                data: { lastMessageAt: message.createdAt },
            });

            return message;
        });
    }

    async markMessageSeen(userId: string, messageId: string) {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        if (!messageId) throw new BadRequestException('messageId is required');

        const existingMessage = await this.prisma.closetChatMessage.findUnique({
            where: { id: messageId },
            select: {
                id: true,
                senderId: true,
                receiverId: true,
                threadId: true,
                isSeen: true,
            },
        });

        if (!existingMessage) {
            throw new NotFoundException('Closet chat message not found');
        }

        if (existingMessage.receiverId !== userId) {
            throw new UnauthorizedException('Unauthorized');
        }

        const updated = await this.prisma.closetChatMessage.updateMany({
            where: {
                id: messageId,
                receiverId: userId,
                isSeen: false,
            },
            data: {
                isSeen: true,
            },
        });

        return {
            message: 'Message seen status updated',
            updatedCount: updated.count,
            threadId: existingMessage.threadId,
            otherUserId: existingMessage.senderId,
        };
    }

    async ensureOrderPlacedThreadAndMessage(orderId: string) {
        if (!orderId) throw new BadRequestException('orderId is required');

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    select: {
                        product: {
                            select: {
                                id: true,
                                buyerChatEnabled: true,
                            },
                        },
                    },
                },
            },
        });

        if (!order) throw new NotFoundException('Order not found');

        const isBuyerChatEnabled = order.items.some((item) => item.product?.buyerChatEnabled === true);
        if (!isBuyerChatEnabled) {
            return {
                enabled: false,
                threadCreated: false,
                messageCreated: false,
            };
        }

        let threadId = '';
        let messageCreated = false;

        await this.prisma.$transaction(async (tx) => {
            const thread = await tx.closetChatThread.upsert({
                where: { orderId: order.id },
                create: {
                    orderId: order.id,
                    buyerId: order.buyerId,
                    sellerId: order.sellerId,
                    closetId: order.closetId,
                    status: ClosetChatThreadStatus.ACTIVE,
                },
                update: {
                    status: ClosetChatThreadStatus.ACTIVE,
                },
                select: { id: true },
            });

            threadId = thread.id;

            const existingSystemMessage = await tx.closetChatMessage.findFirst({
                where: {
                    threadId: thread.id,
                    eventType: ClosetChatMessageEventType.ORDER_PLACED,
                },
                select: { id: true },
            });

            if (!existingSystemMessage) {
                try {
                    const created = await tx.closetChatMessage.create({
                        data: {
                            threadId: thread.id,
                            senderId: order.buyerId,
                            receiverId: order.sellerId,
                            content: 'I have placed a order',
                            type: ClosetChatMessageType.SYSTEM,
                            eventType: ClosetChatMessageEventType.ORDER_PLACED,
                        },
                        select: { id: true, createdAt: true },
                    });

                    messageCreated = true;

                    await tx.closetChatThread.update({
                        where: { id: thread.id },
                        data: {
                            lastMessageAt: created.createdAt,
                        },
                    });
                } catch (error) {
                    // Handle rare race between duplicated webhook events.
                    if (
                        error instanceof Prisma.PrismaClientKnownRequestError &&
                        error.code === 'P2002'
                    ) {
                        messageCreated = false;
                        return;
                    }
                    throw error;
                }
            }
        });

        return {
            enabled: true,
            threadCreated: true,
            messageCreated,
            threadId,
        };
    }
}
