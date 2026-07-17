import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadBufferToS3, uploadFileToS3, uploadImageToS3 } from '../common/s3.util';
import { generateThumbnailForMedia } from '../common/media-thumbnail.util';
import { NotificationService } from '../notification/notification.service';
import { Prisma } from '@prisma/client';

const STORY_TYPES = ['normal', 'subscription-content', 'private-circle'] as const;
type StoryType = (typeof STORY_TYPES)[number];

@Injectable()
export class StoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  private normalizeStoryType(type?: string): StoryType {
    if (!type || type.trim() === '') return 'normal';

    const normalizedType = type.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/\s*-\s*/g, '-');
    if (normalizedType === 'pay-following') return 'subscription-content';

    if (!STORY_TYPES.includes(normalizedType as StoryType)) {
      throw new BadRequestException('type must be one of: normal, subscription-content, private-circle');
    }

    return normalizedType as StoryType;
  }

  private buildAccessibleStoryWhere(viewerId: string): Prisma.StoryWhereInput {
    const now = new Date();

    return {
      OR: [
        { userId: viewerId },
        { type: 'normal' },
        {
          type: { in: ['subscription-content', 'pay-following'] },
          user: {
            is: {
              receivedPayments: {
                some: {
                  userId: viewerId,
                  forPayment: 'following',
                  status: 'succeeded',
                  periodEnd: { gt: now },
                },
              },
            },
          },
        },
        {
          type: 'private-circle',
          user: {
            is: {
              privateCircles: {
                some: {
                  isActive: true,
                  members: {
                    some: {
                      userId: viewerId,
                      status: 'ACTIVE',
                    },
                  },
                },
              },
            },
          },
        },
      ],
    };
  }

  private async getAccessibleStory(storyId: string, viewerId: string) {
    return this.prisma.story.findFirst({
      where: {
        id: storyId,
        deletedAt: null,
        AND: [this.buildAccessibleStoryWhere(viewerId)],
      },
    });
  }

  async uploadStory(userId: string, files?: Express.Multer.File[], caption?: string, storyMeta?: string, type?: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!files || files.length === 0) throw new BadRequestException('At least one media file is required');
    const storyType = this.normalizeStoryType(type);

    const mediaFiles = files.filter(f => f.fieldname === 'media');
    const audioFiles = files.filter(f => f.fieldname.startsWith('audio_'));
    if (mediaFiles.length === 0) throw new BadRequestException('At least one media file is required');

    let parsedStoryMeta: any = null;
    if (storyMeta && storyMeta.trim() !== '') {
      try {
        parsedStoryMeta = JSON.parse(storyMeta);
      } catch {
        throw new BadRequestException('storyMeta must be valid JSON');
      }
    }

    if (audioFiles.length > 0 && !parsedStoryMeta) {
      throw new BadRequestException('storyMeta is required when audio files are uploaded');
    }

    const uploadedMedia = await Promise.all(
      mediaFiles.map(async (file) => {
        const mediaUrl = await uploadImageToS3(file, 'story-media');
        let thumbnailUrl: string;
        try {
          const thumbnailFile = await generateThumbnailForMedia(file);
          thumbnailUrl = await uploadBufferToS3(
            thumbnailFile.buffer,
            thumbnailFile.originalname,
            thumbnailFile.mimetype,
            'story-thumbnails',
          );
        } catch (thumbnailError) {
          if (file.mimetype?.startsWith('video/')) {
            console.warn('Story video thumbnail generation failed, using media URL as fallback:', thumbnailError);
            thumbnailUrl = mediaUrl;
          } else {
            throw thumbnailError;
          }
        }
        return { mediaUrl, thumbnailUrl };
      }),
    );

    const urls = uploadedMedia.map((item) => item.mediaUrl);
    const thumbnailUrls = uploadedMedia.map((item) => item.thumbnailUrl);

    if (parsedStoryMeta && Array.isArray(parsedStoryMeta.clips)) {
      const audioByIndex = new Map<number, Express.Multer.File>();
      for (const file of audioFiles) {
        const rawIndex = file.fieldname.replace('audio_', '');
        const index = Number(rawIndex);
        if (!Number.isInteger(index) || index < 0) {
          throw new BadRequestException(`Invalid audio field name: ${file.fieldname}`);
        }
        audioByIndex.set(index, file);
      }

      for (let i = 0; i < parsedStoryMeta.clips.length; i += 1) {
        const clip = parsedStoryMeta.clips[i];
        const clipIndex = Number.isInteger(clip?.index) ? clip.index : i;
        const audioFile = audioByIndex.get(clipIndex);
        if (audioFile) {
          const audioUrl = await uploadFileToS3(audioFile, 'story-audio');
          clip.audioUrl = audioUrl;
        }
      }
    } else if (audioFiles.length > 0) {
      throw new BadRequestException('storyMeta.clips must be an array when audio files are uploaded');
    }

    return this.prisma.story.create({
      data: {
        userId,
        media: urls,
        thumbnails: thumbnailUrls,
        caption: caption && caption.trim() !== '' ? caption : null,
        type: storyType,
        storyMeta: parsedStoryMeta,
      },
    });
  }

  async viewUserStory(targetUserId: string, viewerId: string, time?: string) {
    if (!targetUserId) throw new BadRequestException('User ID required');
    if (!viewerId) throw new BadRequestException('Viewer ID required');
    const isAll = (time || '').toLowerCase() === 'all';
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await this.prisma.story.findMany({
      where: {
        userId: targetUserId,
        isDeleted: 'no',
        ...(isAll ? {} : { createdAt: { gte: last24Hours } }),
        AND: [this.buildAccessibleStoryWhere(viewerId)],
      },
      orderBy: { createdAt: 'asc' },
    });
    return stories;
  }

  async deleteStory(storyId: string, userId: string) {
    if (!storyId) throw new BadRequestException('Story ID required');
    if (!userId) throw new BadRequestException('User ID required');

    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.isDeleted === 'yes') throw new NotFoundException('Story not found');
    if (story.userId !== userId) throw new BadRequestException('Unauthorized');

    await this.prisma.story.update({ where: { id: storyId }, data: { deletedAt: new Date(), isDeleted: 'yes' } });
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
        AND: [this.buildAccessibleStoryWhere(userId)],
      },
      include: {
        user: true, // optional: to return story owner details
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async viewStory(storyId: string, viewerId: string) {
    if (!storyId) throw new BadRequestException('Story ID required');
    if (!viewerId) throw new BadRequestException('User ID required');

    const story = await this.getAccessibleStory(storyId, viewerId);
    if (!story) throw new BadRequestException('Story not found');

    if (story.userId === viewerId) {
      return { message: 'Own story view ignored', viewed: false };
    }

    const existingView = await this.prisma.storyView.findUnique({
      where: {
        storyId_viewerId: {
          storyId,
          viewerId,
        },
      },
    });

    if (existingView) {
      return { message: 'Story already viewed', viewed: false };
    }

    const view = await this.prisma.storyView.create({
      data: {
        storyId,
        viewerId,
        ownerId: story.userId,
      },
    });

    try {
      await this.notificationService.sendStoryViewInsightsIfNeeded(storyId, viewerId);
    } catch (error) {
      console.error('Failed to send story view insights notification:', error);
    }

    return { message: 'Story viewed successfully', viewed: true, view };
  }

  async commentOnStory(userId: string, comment?: string, storyId?: string) {
    if (!storyId) throw new BadRequestException('Story ID required');
    if (!userId) throw new BadRequestException('User ID required');
    if (!comment || comment.trim() === '') throw new BadRequestException('Comment required');
    // Check if story exists and is visible to this user
    const story = await this.getAccessibleStory(storyId, userId);
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

    try {
      await this.notificationService.sendDropTrendingIfNeeded(storyId, userId);
    } catch (error) {
      console.error('Failed to send drop trending notification:', error);
    }

    return conversation;
  }

  async storyLikeByUser(storyId: string, userId: string) {
    if (!storyId) throw new BadRequestException('Story ID required');
    if (!userId) throw new BadRequestException('User ID required');

    // Check if story exists and is visible to this user
    const story = await this.getAccessibleStory(storyId, userId);

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

      try {
        await this.notificationService.sendDropTrendingIfNeeded(storyId, userId);
      } catch (error) {
        console.error('Failed to send drop trending notification:', error);
      }

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

  async listHighlights(userId: string, viewerId?: string) {
    if (!userId) throw new BadRequestException('User ID required');
    const accessibleStoryWhere = viewerId ? this.buildAccessibleStoryWhere(viewerId) : { type: 'normal' };
    return this.prisma.storyHighlight.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            items: {
              where: {
                story: {
                  is: {
                    isDeleted: 'no',
                    AND: [accessibleStoryWhere],
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHighlight(highlightId?: string, viewerId?: string) {
    if (!highlightId) throw new BadRequestException('Highlight ID required');
    const accessibleStoryWhere = viewerId ? this.buildAccessibleStoryWhere(viewerId) : { type: 'normal' };
    const highlight = await this.prisma.storyHighlight.findUnique({
      where: { id: highlightId },
      include: {
        items: {
          where: {
            story: {
              is: {
                deletedAt: null,
                AND: [accessibleStoryWhere],
              },
            },
          },
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


