import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadImageToS3 } from '../common/s3.util';

@Injectable()
export class StoryService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadStory(userId: string, files?: Express.Multer.File[], caption?: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!files || files.length === 0) throw new BadRequestException('At least one media file is required');

    const urls = await Promise.all(files.map(file => uploadImageToS3(file, 'story-media')));

    return this.prisma.story.create({
      data: {
        userId,
        media: urls,
        caption: caption && caption.trim() !== '' ? caption : null,
      },
    });
  }

  async viewUserStory(targetUserId: string, time?: string) {
    if (!targetUserId) throw new BadRequestException('User ID required');
    const isAll = (time || '').toLowerCase() === 'all';
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await this.prisma.story.findMany({
      where: {
        userId: targetUserId,
        deletedAt: null,
        ...(isAll ? {} : { createdAt: { gte: last24Hours } }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return stories;
  }

  async deleteStory(storyId: string, userId: string) {
    if (!storyId) throw new BadRequestException('Story ID required');
    if (!userId) throw new BadRequestException('User ID required');

    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.deletedAt) throw new NotFoundException('Story not found');
    if (story.userId !== userId) throw new BadRequestException('Unauthorized');

    await this.prisma.story.update({ where: { id: storyId }, data: { deletedAt: new Date() } });
    return { message: 'Story deleted' };
  }

  async followingStory(userId: string, time?: string) {
  if (!userId) throw new BadRequestException('User ID required');
  const isAll = (time || '').toLowerCase() === 'all';
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find who this user is following
  const followings = await this.prisma.followerAndFollowing.findMany({
    where: { followerId: userId },
    select: { followingId: true }, // select only what you need
  });

  const followingUserIds = followings.map(f => f.followingId);

  if (followingUserIds.length === 0) {
    return []; // user isn't following anyone
  }

  // Fetch stories from those users
  return this.prisma.story.findMany({
    where: {
      userId: { in: followingUserIds },
      deletedAt: null,
      ...(isAll ? {} : { createdAt: { gte: last24Hours } }),
    },
    include: {
      user: true, // optional: to return story owner details
    },
    orderBy: { createdAt: 'desc' },
  });
}

async commentOnStory(userId: string, comment?: string, storyId?: string) {
   if (!storyId) throw new BadRequestException('Story ID required');
    if (!userId) throw new BadRequestException('User ID required');
    if (!comment || comment.trim() === '') throw new BadRequestException('Comment required');
    // Check if story exists
    const story = await this.prisma.story.findUnique({
      where: { id: storyId, deletedAt: null },
    });
    if (!story) throw new BadRequestException('Story not found');

    // Create conversation record for story comment
    // Note: For story comments, we might want to send to the story owner
    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'MEDIA',
        senderId: userId,
        receiverId: story.userId, // Send to story owner
        mediaId: storyId,
        mediaType: 'STORY',
        content: comment,
      },
    });

    return conversation;
  }

  async storyLikeByUser(storyId: string, userId: string) {
    if (!storyId) throw new BadRequestException('Story ID required');
    if (!userId) throw new BadRequestException('User ID required');

    // Check if post exists
    const story = await this.prisma.story.findUnique({
      where: { 
        id: storyId
      },
    });
    
    if (!story) {
      throw new BadRequestException('Story not found');
    }

    // Check if user already liked the post
    const existingLike = await this.prisma.storyLike.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike the post
      await this.prisma.storyLike.delete({
        where: {
          storyId_userId: {
            storyId,
            userId,
          },
        },
      });
      return { message: 'Story unliked successfully', liked: false };
    } else {
      // Like the post
      await this.prisma.storyLike.create({
        data: {
          storyId,
          userId,
        },
      });
      return { message: 'Story liked successfully', liked: true };
    }
  }

  async createHighlight(userId: string, title?: string, coverImageFile?: Express.Multer.File, storyIds?: string[]) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!title || title.trim() === '') throw new BadRequestException('Title required');

    const cleanTitle = title.trim();
    const cleanCover = coverImageFile ? await uploadImageToS3(coverImageFile, 'story-highlights') : null;
    const uniqueStoryIds = Array.from(new Set((storyIds || []).filter(Boolean)));

    if (uniqueStoryIds.length > 0) {
      await this.ensureStoriesOwnedByUser(userId, uniqueStoryIds);
    }

    const highlight = await this.prisma.storyHighlight.create({
      data: {
        userId,
        title: cleanTitle,
        coverImage: cleanCover,
        items: uniqueStoryIds.length > 0 ? {
          createMany: {
            data: uniqueStoryIds.map((id, index) => ({
              storyId: id,
              position: index,
            })),
          },
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    return highlight;
  }

  async updateHighlight(userId: string, highlightId?: string, title?: string, coverImageFile?: Express.Multer.File) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!highlightId) throw new BadRequestException('Highlight ID required');

    const highlight = await this.prisma.storyHighlight.findFirst({
      where: { id: highlightId, userId },
    });
    if (!highlight) throw new NotFoundException('Highlight not found');

    const data: { title?: string; coverImage?: string | null } = {};
    if (title !== undefined) {
      if (title.trim() === '') throw new BadRequestException('Title cannot be empty');
      data.title = title.trim();
    }
    if (coverImageFile) {
      data.coverImage = await uploadImageToS3(coverImageFile, 'story-highlights');
    }

    return this.prisma.storyHighlight.update({
      where: { id: highlightId },
      data,
    });
  }

  async addStoryToHighlight(userId: string, highlightId?: string, storyId?: string, position?: number) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!highlightId) throw new BadRequestException('Highlight ID required');
    if (!storyId) throw new BadRequestException('Story ID required');

    const highlight = await this.prisma.storyHighlight.findFirst({
      where: { id: highlightId, userId },
    });
    if (!highlight) throw new NotFoundException('Highlight not found');

    await this.ensureStoriesOwnedByUser(userId, [storyId]);

    const existing = await this.prisma.storyHighlightItem.findFirst({
      where: { highlightId, storyId },
    });
    if (existing) {
      throw new BadRequestException('Story already in highlight');
    }

    const item = await this.prisma.storyHighlightItem.create({
      data: {
        highlightId,
        storyId,
        position: typeof position === 'number' ? position : null,
      },
    });

    return item;
  }

  async removeStoryFromHighlight(userId: string, highlightId?: string, storyId?: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!highlightId) throw new BadRequestException('Highlight ID required');
    if (!storyId) throw new BadRequestException('Story ID required');

    const highlight = await this.prisma.storyHighlight.findFirst({
      where: { id: highlightId, userId },
    });
    if (!highlight) throw new NotFoundException('Highlight not found');

    await this.prisma.storyHighlightItem.deleteMany({
      where: { highlightId, storyId },
    });

    return { message: 'Story removed from highlight' };
  }

  async listHighlights(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    return this.prisma.storyHighlight.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHighlight(highlightId?: string) {
    if (!highlightId) throw new BadRequestException('Highlight ID required');
    const highlight = await this.prisma.storyHighlight.findUnique({
      where: { id: highlightId },
      include: {
        items: {
          include: { story: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
        user: true,
      },
    });
    if (!highlight) throw new NotFoundException('Highlight not found');
    return highlight;
  }

  private async ensureStoriesOwnedByUser(userId: string, storyIds: string[]) {
    const stories = await this.prisma.story.findMany({
      where: { id: { in: storyIds }, userId },
      select: { id: true, createdAt: true, deletedAt: true },
    });

    if (stories.length !== storyIds.length) {
      throw new BadRequestException('One or more stories not found');
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const manuallyDeleted = stories.find(s => s.deletedAt && s.createdAt >= cutoff);
    if (manuallyDeleted) {
      throw new BadRequestException('Cannot add deleted story to highlight');
    }
  }
}


