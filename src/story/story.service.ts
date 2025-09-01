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

  async viewUserStory(targetUserId: string) {
    if (!targetUserId) throw new BadRequestException('User ID required');
    const stories = await this.prisma.story.findMany({
      where: { userId: targetUserId, deletedAt: null },
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

  async followingStory(userId: string) {
  if (!userId) throw new BadRequestException('User ID required');

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
    },
    include: {
      user: true, // optional: to return story owner details
    },
    orderBy: { createdAt: 'desc' },
  });
}

}


