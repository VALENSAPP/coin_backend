import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

type PrivateCircleLimits = {
  min: number;
  max: number;
};

@Injectable()
export class PrivateCircleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  private toHandle(name?: string | null, fallback = 'username'): string {
    const safeName = name?.trim() || fallback;
    return safeName.startsWith('@') ? safeName : `@${safeName}`;
  }

  private truncateText(value?: string | null, maxLength = 120): string {
    const text = value?.trim() || '';
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
  }

  private getPrivateCircleLimits(user: {
    profile?: string | null;
    fansPage?: number | null;
    companyProfile?: unknown;
  }): PrivateCircleLimits {
    const profile = (user.profile || '').toLowerCase();
    const isBusinessOrCreator =
      !!user.companyProfile ||
      user.fansPage === 1 ||
      profile.includes('business') ||
      profile.includes('creator') ||
      profile.includes('company');

    return isBusinessOrCreator ? { min: 50, max: 200 } : { min: 10, max: 50 };
  }

  private async getOwnerWithProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        userName: true,
        profile: true,
        fansPage: true,
        companyProfile: { select: { id: true } },
      },
    });

    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  private async getOrCreateCircle(ownerId: string) {
    const owner = await this.getOwnerWithProfile(ownerId);
    const existingCircle = await this.prisma.privateCircle.findUnique({
      where: { ownerId },
    });

    if (existingCircle) return existingCircle;

    const limits = this.getPrivateCircleLimits(owner);
    return this.prisma.privateCircle.create({
      data: {
        ownerId,
        minSlots: limits.min,
        maxSlots: limits.max,
      },
    });
  }

  private async buildCircleResponse(circleId: string) {
    const circle = await this.prisma.privateCircle.findUnique({
      where: { id: circleId },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            userName: true,
            image: true,
            profile: true,
          },
        },
        members: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                userName: true,
                image: true,
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!circle) throw new BadRequestException('Private circle not found');

    const privateCirclePostsCount = await this.prisma.post.count({
      where: {
        userId: circle.ownerId,
        type: 'private',
        visibleTo: 'PRIVATE_CIRCLE',
        isDelete: 'no',
      },
    });

    const usedSlots = circle.members.length;
    return {
      id: circle.id,
      ownerId: circle.ownerId,
      owner: circle.owner,
      isActive: circle.isActive,
      limits: {
        min: circle.minSlots,
        max: circle.maxSlots,
      },
      usedSlots,
      availableSlots: Math.max(circle.maxSlots - usedSlots, 0),
      isMinimumReached: usedSlots >= circle.minSlots,
      privateCirclePostsCount,
      members: circle.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        status: member.status,
        addedAt: member.createdAt,
        user: member.user,
      })),
      createdAt: circle.createdAt,
      updatedAt: circle.updatedAt,
    };
  }

  async setup(ownerId: string) {
    if (!ownerId) throw new BadRequestException('User ID required');
    const circle = await this.getOrCreateCircle(ownerId);
    return this.buildCircleResponse(circle.id);
  }

  async getDashboard(ownerId: string) {
    if (!ownerId) throw new BadRequestException('User ID required');
    const circle = await this.getOrCreateCircle(ownerId);
    return this.buildCircleResponse(circle.id);
  }

  async getMembers(ownerId: string) {
    if (!ownerId) throw new BadRequestException('User ID required');
    const circle = await this.getOrCreateCircle(ownerId);

    const members = await this.prisma.privateCircleMember.findMany({
      where: { privateCircleId: circle.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            userName: true,
            image: true,
            profile: true,
          },
        },
      },
    });

    const usedSlots = members.length;
    return {
      privateCircleId: circle.id,
      usedSlots,
      availableSlots: Math.max(circle.maxSlots - usedSlots, 0),
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        status: member.status,
        addedAt: member.createdAt,
        user: member.user,
      })),
    };
  }

  async getOwnerPostInteractions(ownerId: string, limit: number = 100) {
    if (!ownerId) throw new BadRequestException('User ID required');

    const safeLimit = Math.min(Math.max(1, limit), 200);
    const privateCircleVisibilityValues = [
      'PRIVATE_CIRCLE',
      'private_circle',
      'private-circle',
      'private circle',
      'Private Circle',
    ];

    const circle = await this.prisma.privateCircle.findUnique({
      where: { ownerId },
      select: { id: true },
    });

    if (!circle) {
      return {
        privateCircleId: null,
        notifications: [],
      };
    }

    const [likes, comments] = await Promise.all([
      this.prisma.postLike.findMany({
        where: {
          userId: { not: ownerId },
          post: {
            userId: ownerId,
            deletedAt: null,
            visibleTo: { in: privateCircleVisibilityValues },
          },
        },
        select: {
          id: true,
          createdAt: true,
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
      this.prisma.postComment.findMany({
        where: {
          userId: { not: ownerId },
          post: {
            userId: ownerId,
            deletedAt: null,
            visibleTo: { in: privateCircleVisibilityValues },
          },
        },
        select: {
          id: true,
          createdAt: true,
          comment: true,
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
    ]);

    const likeItems = likes.map((like) => {
      const actorHandle = this.toHandle(like.user?.userName || like.user?.displayName);
      return {
        id: `pc_like_${like.id}`,
        type: 'private_circle_post_like',
        title: 'Post Liked',
        body: `${actorHandle} liked your post.`,
        postId: like.post?.id || '',
        actorId: like.user?.id || '',
        actorImage: like.user?.image || '',
        actorUserName: actorHandle,
        actorDisplayName: like.user?.displayName || '',
        createdAt: like.createdAt,
      };
    });

    const commentItems = comments.map((comment) => {
      const actorHandle = this.toHandle(comment.user?.userName || comment.user?.displayName);
      return {
        id: `pc_comment_${comment.id}`,
        type: 'private_circle_post_comment',
        title: 'New Comment',
        body: `${actorHandle} commented on your post.`,
        postId: comment.post?.id || '',
        actorId: comment.user?.id || '',
        actorImage: comment.user?.image || '',
        actorUserName: actorHandle,
        actorDisplayName: comment.user?.displayName || '',
        comment: this.truncateText(comment.comment, 120),
        createdAt: comment.createdAt,
      };
    });

    const notifications = [...likeItems, ...commentItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, safeLimit);

    return {
      privateCircleId: circle.id,
      notifications,
    };
  }

  async getUserMembers(ownerId: string) {
    if (!ownerId) throw new BadRequestException('User ID required');

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!owner) throw new BadRequestException('User not found');

    const circle = await this.prisma.privateCircle.findUnique({
      where: { ownerId },
    });

    if (!circle) {
      return {
        privateCircleId: null,
        ownerId,
        usedSlots: 0,
        postCount: 0,
        memberCount: 0,
        availableSlots: 0,
        members: [],
      };
    }

    const members = await this.prisma.privateCircleMember.findMany({
      where: { privateCircleId: circle.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            userName: true,
            image: true,
            profile: true,
          },
        },
      },
    });

    const memberCount = members.length;

    const postCount = await this.prisma.post.count({
      where: {
        userId: ownerId,
        type: 'private',
        visibleTo: 'PRIVATE_CIRCLE',
        isDelete: 'no',
      },
    });

    const usedSlots = members.length;
    return {
      privateCircleId: circle.id,
      ownerId: circle.ownerId,
      usedSlots,
      postCount,
      memberCount,
      availableSlots: Math.max(circle.maxSlots - usedSlots, 0),
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        status: member.status,
        addedAt: member.createdAt,
        user: member.user,
      })),
    };
  }

  async addMembers(ownerId: string, userIds: string[]) {
    if (!ownerId) throw new BadRequestException('User ID required');
    const uniqueUserIds = Array.from(
      new Set((userIds || []).map((id) => String(id).trim()).filter(Boolean)),
    ).filter((id) => id !== ownerId);

    if (!uniqueUserIds.length) {
      throw new BadRequestException('At least one user ID is required');
    }

    const circle = await this.getOrCreateCircle(ownerId);
    const activeCount = await this.prisma.privateCircleMember.count({
      where: { privateCircleId: circle.id, status: 'ACTIVE' },
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds }, isDeleted: 0 },
      select: { id: true },
    });
    const validUserIds = new Set(users.map((user) => user.id));

    const existingMembers = await this.prisma.privateCircleMember.findMany({
      where: { privateCircleId: circle.id, userId: { in: uniqueUserIds } },
      select: { id: true, userId: true, status: true },
    });
    const existingByUserId = new Map(existingMembers.map((member) => [member.userId, member]));

    const added: string[] = [];
    const skipped: Array<{ userId: string; reason: string }> = [];
    const candidates: string[] = [];

    for (const userId of uniqueUserIds) {
      if (!validUserIds.has(userId)) {
        skipped.push({ userId, reason: 'User not found' });
        continue;
      }

      const existingMember = existingByUserId.get(userId);
      if (existingMember?.status === 'ACTIVE') {
        skipped.push({ userId, reason: 'Already in private circle' });
        continue;
      }

      candidates.push(userId);
    }

    const availableSlots = circle.maxSlots - activeCount;
    const usersToAdd = candidates.slice(0, Math.max(availableSlots, 0));
    candidates.slice(usersToAdd.length).forEach((userId) => {
      skipped.push({ userId, reason: 'No private circle slots available' });
    });

    if (usersToAdd.length) {
      await this.prisma.$transaction(
        usersToAdd.map((userId) => {
          const existingMember = existingByUserId.get(userId);
          if (existingMember) {
            return this.prisma.privateCircleMember.update({
              where: { id: existingMember.id },
              data: { status: 'ACTIVE' },
            });
          }

          return this.prisma.privateCircleMember.create({
            data: {
              privateCircleId: circle.id,
              userId,
              status: 'ACTIVE',
            },
          });
        }),
      );

      added.push(...usersToAdd);
      const owner = await this.getOwnerWithProfile(ownerId);
      const ownerName = owner.displayName || owner.userName || 'A creator';
      await this.notificationService.sendNotificationToMultipleUsers(
        usersToAdd,
        "You've Been Chosen",
        `${ownerName} added you to their Private Circle.`,
        {
          type: 'private_circle_added',
          privateCircleId: circle.id,
          ownerId,
        },
      );

      try {
        await Promise.all(
          usersToAdd.map((joinedUserId) =>
            this.notificationService.sendPrivateCircleGrowing(ownerId, joinedUserId, circle.id),
          ),
        );
      } catch (notificationError) {
        console.error('Failed to send private circle growing notification:', notificationError);
      }
    }

    const usedSlots = activeCount + added.length;
    return {
      added,
      skipped,
      slots: {
        used: usedSlots,
        max: circle.maxSlots,
        available: Math.max(circle.maxSlots - usedSlots, 0),
      },
    };
  }

  async removeMember(ownerId: string, memberUserId: string) {
    if (!ownerId) throw new BadRequestException('User ID required');
    if (!memberUserId) throw new BadRequestException('Member user ID required');
    if (ownerId === memberUserId) throw new BadRequestException('Owner cannot remove themselves');

    const circle = await this.prisma.privateCircle.findUnique({ where: { ownerId } });
    if (!circle) throw new BadRequestException('Private circle not found');

    const member = await this.prisma.privateCircleMember.findUnique({
      where: {
        privateCircleId_userId: {
          privateCircleId: circle.id,
          userId: memberUserId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new BadRequestException('Member not found in private circle');
    }

    await this.prisma.privateCircleMember.update({
      where: { id: member.id },
      data: { status: 'REMOVED' },
    });

    try {
      await this.notificationService.sendPrivateCircleAccessRemoved(memberUserId, ownerId, circle.id);
    } catch (notificationError) {
      console.error('Failed to send private circle access removed notification:', notificationError);
    }

    const activeCount = await this.prisma.privateCircleMember.count({
      where: { privateCircleId: circle.id, status: 'ACTIVE' },
    });

    return {
      message: 'Member removed from private circle',
      slots: {
        used: activeCount,
        max: circle.maxSlots,
        available: Math.max(circle.maxSlots - activeCount, 0),
      },
    };
  }

  async deleteCircle(ownerId: string) {
    if (!ownerId) throw new BadRequestException('User ID required');

    const circle = await this.prisma.privateCircle.findUnique({
      where: { ownerId },
      select: { id: true },
    });

    if (!circle) throw new BadRequestException('Private circle not found');

    await this.prisma.privateCircle.delete({
      where: { id: circle.id },
    });

    return {
      message: 'Private circle deleted successfully',
    };
  }
}
