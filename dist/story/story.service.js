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
exports.StoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3_util_1 = require("../common/s3.util");
let StoryService = class StoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async uploadStory(userId, files, caption) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        if (!files || files.length === 0)
            throw new common_1.BadRequestException('At least one media file is required');
        const urls = await Promise.all(files.map(file => (0, s3_util_1.uploadImageToS3)(file, 'story-media')));
        return this.prisma.story.create({
            data: {
                userId,
                media: urls,
                caption: caption && caption.trim() !== '' ? caption : null,
            },
        });
    }
    async viewUserStory(targetUserId) {
        if (!targetUserId)
            throw new common_1.BadRequestException('User ID required');
        const stories = await this.prisma.story.findMany({
            where: { userId: targetUserId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
        return stories;
    }
    async deleteStory(storyId, userId) {
        if (!storyId)
            throw new common_1.BadRequestException('Story ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const story = await this.prisma.story.findUnique({ where: { id: storyId } });
        if (!story || story.deletedAt)
            throw new common_1.NotFoundException('Story not found');
        if (story.userId !== userId)
            throw new common_1.BadRequestException('Unauthorized');
        await this.prisma.story.update({ where: { id: storyId }, data: { deletedAt: new Date() } });
        return { message: 'Story deleted' };
    }
    async followingStory(userId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const followings = await this.prisma.followerAndFollowing.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followingUserIds = followings.map(f => f.followingId);
        if (followingUserIds.length === 0) {
            return [];
        }
        return this.prisma.story.findMany({
            where: {
                userId: { in: followingUserIds },
                deletedAt: null,
            },
            include: {
                user: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async commentOnStory(userId, comment, storyId) {
        if (!storyId)
            throw new common_1.BadRequestException('Story ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        if (!comment || comment.trim() === '')
            throw new common_1.BadRequestException('Comment required');
        const story = await this.prisma.story.findUnique({
            where: { id: storyId, deletedAt: null },
        });
        if (!story)
            throw new common_1.BadRequestException('Story not found');
        const conversation = await this.prisma.conversation.create({
            data: {
                type: 'STORY_COMMENT',
                senderId: userId,
                receiverId: story.userId,
                storyId,
                content: comment,
            },
        });
        return conversation;
    }
    async storyLikeByUser(storyId, userId) {
        if (!storyId)
            throw new common_1.BadRequestException('Story ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const story = await this.prisma.story.findUnique({
            where: {
                id: storyId
            },
        });
        if (!story) {
            throw new common_1.BadRequestException('Story not found');
        }
        const existingLike = await this.prisma.storyLike.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId,
                },
            },
        });
        if (existingLike) {
            await this.prisma.storyLike.delete({
                where: {
                    storyId_userId: {
                        storyId,
                        userId,
                    },
                },
            });
            return { message: 'Story unliked successfully', liked: false };
        }
        else {
            await this.prisma.storyLike.create({
                data: {
                    storyId,
                    userId,
                },
            });
            return { message: 'Story liked successfully', liked: true };
        }
    }
};
exports.StoryService = StoryService;
exports.StoryService = StoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StoryService);
//# sourceMappingURL=story.service.js.map