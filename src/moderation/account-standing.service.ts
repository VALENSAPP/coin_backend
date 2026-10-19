import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountStandingResponseDto } from './dto/account-standing.dto';

@Injectable()
export class AccountStandingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get account standing and active safety restrictions for a user (Spec Section 8)
   */
  async getAccountStanding(userId: string): Promise<AccountStandingResponseDto> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountStanding: true,
        standingWarningCount: true,
        standingStrikeCount: true,
        standingUntil: true,
        standingReason: true,
        isBlocked: true,
        bannedUntil: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if temporary suspension has expired
    let standing = user.accountStanding || 'GOOD';
    const now = new Date();

    if (user.standingUntil && new Date(user.standingUntil) <= now) {
      if (standing === 'SUSPENDED' || standing === 'RESTRICTED') {
        standing = 'GOOD';
        await (this.prisma as any).user.update({
          where: { id: userId },
          data: {
            accountStanding: 'GOOD',
            standingUntil: null,
            standingReason: null,
          },
        });
      }
    }

    // Fetch active violations/restrictions
    const activeViolations = await (this.prisma as any).accountViolation.findMany({
      where: {
        userId,
        overturned: false,
        OR: [
          { restrictionEnd: null },
          { restrictionEnd: { gt: now } },
        ],
      },
      select: {
        id: true,
        category: true,
        severity: true,
        action: true,
        restrictionScope: true,
        restrictionStart: true,
        restrictionEnd: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const activeRestrictions = activeViolations
      .filter((v: any) => v.restrictionScope)
      .map((v: any) => ({
        scope: v.restrictionScope,
        reason: 'Community standards enforcement',
        endsAt: v.restrictionEnd,
      }));

    return {
      userId: user.id,
      standing,
      warningCount: user.standingWarningCount || 0,
      strikeCount: user.standingStrikeCount || 0,
      standingUntil: user.standingUntil,
      standingReason: user.standingReason,
      activeRestrictions,
      recentViolations: activeViolations,
    };
  }

  /**
   * Block a user (RESTful: POST /v1/users/{userId}/block)
   */
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const targetUser = await (this.prisma as any).user.findUnique({
      where: { id: blockedId },
    });
    if (!targetUser) {
      throw new NotFoundException('User to block not found');
    }

    const existing = await (this.prisma as any).blockedUser.findFirst({
      where: { blockerId, blockedId },
    });

    if (!existing) {
      await (this.prisma as any).blockedUser.create({
        data: { blockerId, blockedId },
      });
    }

    return {
      message: 'User blocked successfully',
      blockerId,
      blockedId,
    };
  }

  /**
   * Unblock a user (RESTful: DELETE /v1/users/{userId}/block)
   */
  async unblockUser(blockerId: string, blockedId: string) {
    await (this.prisma as any).blockedUser.deleteMany({
      where: { blockerId, blockedId },
    });

    return {
      message: 'User unblocked successfully',
      blockerId,
      blockedId,
    };
  }

  /**
   * Mute a user (RESTful: POST /v1/users/{userId}/mute)
   */
  async muteUser(muterId: string, mutedId: string) {
    if (muterId === mutedId) {
      throw new BadRequestException('You cannot mute yourself');
    }

    const targetUser = await (this.prisma as any).user.findUnique({
      where: { id: mutedId },
    });
    if (!targetUser) {
      throw new NotFoundException('User to mute not found');
    }

    const existing = await (this.prisma as any).userMute.findFirst({
      where: { muterId, mutedId },
    });

    if (!existing) {
      await (this.prisma as any).userMute.create({
        data: { muterId, mutedId },
      });
    }

    return {
      message: 'User muted successfully',
      muterId,
      mutedId,
    };
  }

  /**
   * Unmute a user (RESTful: DELETE /v1/users/{userId}/mute)
   */
  async unmuteUser(muterId: string, mutedId: string) {
    await (this.prisma as any).userMute.deleteMany({
      where: { muterId, mutedId },
    });

    return {
      message: 'User unmuted successfully',
      muterId,
      mutedId,
    };
  }

  /**
   * Get blocked and muted users list
   */
  async getUserSafetySettings(userId: string) {
    const [blocked, muted] = await Promise.all([
      (this.prisma as any).blockedUser.findMany({
        where: { blockerId: userId },
        include: {
          blocked: {
            select: { id: true, displayName: true, userName: true, image: true },
          },
        },
      }),
      (this.prisma as any).userMute.findMany({
        where: { muterId: userId },
        include: {
          muted: {
            select: { id: true, displayName: true, userName: true, image: true },
          },
        },
      }),
    ]);

    return {
      blockedUsers: blocked.map((b: any) => b.blocked),
      mutedUsers: muted.map((m: any) => m.muted),
    };
  }
}
