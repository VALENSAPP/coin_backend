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
  ) {}

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

    const usedSlots = members.length;
    return {
      privateCircleId: circle.id,
      ownerId: circle.ownerId,
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
        'Added to Private Circle',
        `${ownerName} added you to their Private Circle.`,
        {
          type: 'private_circle_added',
          privateCircleId: circle.id,
          ownerId,
        },
      );
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
