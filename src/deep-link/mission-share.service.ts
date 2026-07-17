import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenPurchaseService } from '../token-purchase/token-purchase.service';
import { DonationResponseDto } from '../token-purchase/dto/purchase-tokens.dto';

export const MISSION_SHARE_POST_TYPES = ['crowdfunding', 'support', 'mission-post'] as const;

export type MissionShareStatus = 'active' | 'not_started' | 'closed' | 'goal_reached' | 'unavailable';

export interface MissionSharePageData {
  isMission: boolean;
  postId: string;
  vendorId: string;
  vendorName: string;
  vendorHandle: string;
  vendorImage: string | null;
  title: string;
  image: string | null;
  goalAmount: number;
  raisedAmount: number;
  remainingAmount: number;
  fundedPercent: number;
  canDonate: boolean;
  status: MissionShareStatus;
  statusMessage: string;
  startTime: string | null;
  endTime: string | null;
}

@Injectable()
export class MissionShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenPurchaseService: TokenPurchaseService,
  ) {}

  isMissionPostType(type?: string | null): boolean {
    return !!type && (MISSION_SHARE_POST_TYPES as readonly string[]).includes(type);
  }

  async getMissionSharePageData(postId: string): Promise<MissionSharePageData | null> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
        isDelete: 'no',
        postHide: 'no',
      },
      select: {
        id: true,
        userId: true,
        type: true,
        text: true,
        caption: true,
        images: true,
        raiseAmount: true,
        start_time: true,
        end_time: true,
        user: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!this.isMissionPostType(post.type)) {
      return null;
    }

    const raisedResult = await this.prisma.donationData.aggregate({
      where: {
        postId: post.id,
        status: 'completed',
        action: { in: ['missionDonation', 'donate'] },
      },
      _sum: { amount: true, totalAmount: true },
    });

    const raisedAmount = this.roundCurrency(
      Number(raisedResult._sum.totalAmount ?? raisedResult._sum.amount ?? 0),
    );
    const goalAmount = this.roundCurrency(Number(post.raiseAmount || 0));
    const remainingAmount = goalAmount > 0 ? this.roundCurrency(Math.max(0, goalAmount - raisedAmount)) : 0;
    const fundedPercent =
      goalAmount > 0 ? Math.min(100, Math.floor((raisedAmount / goalAmount) * 100)) : 0;

    const now = new Date();
    let status: MissionShareStatus = 'active';
    let statusMessage = 'Support this mission with a secure donation.';
    let canDonate = true;

    if (!post.start_time || !post.end_time || goalAmount <= 0) {
      status = 'unavailable';
      statusMessage = 'This mission is not available for donations right now.';
      canDonate = false;
    } else if (post.start_time > now) {
      status = 'not_started';
      statusMessage = 'This mission has not started yet.';
      canDonate = false;
    } else if (post.end_time <= now) {
      status = 'closed';
      statusMessage = 'This mission is closed because the deadline has passed.';
      canDonate = false;
    } else if (remainingAmount <= 0) {
      status = 'goal_reached';
      statusMessage = 'This mission has already reached its funding goal.';
      canDonate = false;
    }

    const vendorName = post.user.displayName || post.user.userName || 'Valens Creator';
    const vendorHandle = post.user.userName || post.user.displayName || 'creator';
    const title = (post.caption || post.text || `${vendorName}'s Mission`).trim();
    const image = Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : null;

    return {
      isMission: true,
      postId: post.id,
      vendorId: post.userId,
      vendorName,
      vendorHandle,
      vendorImage: post.user.image || null,
      title,
      image,
      goalAmount,
      raisedAmount,
      remainingAmount,
      fundedPercent,
      canDonate,
      status,
      statusMessage,
      startTime: post.start_time?.toISOString() ?? null,
      endTime: post.end_time?.toISOString() ?? null,
    };
  }

  async createWebDonation(postId: string, amount: number, note?: string): Promise<DonationResponseDto> {
    const pageData = await this.getMissionSharePageData(postId);
    if (!pageData) {
      throw new BadRequestException('This post is not a mission donation post');
    }
    if (!pageData.canDonate) {
      throw new BadRequestException(pageData.statusMessage);
    }

    return this.tokenPurchaseService.webMissionPostDonation({
      amount,
      vendorId: pageData.vendorId,
      postId: pageData.postId,
      note,
    });
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
