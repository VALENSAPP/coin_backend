import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostCleanupService {
  private readonly logger = new Logger(PostCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Every minute: close mission posts if target reached, and report deadline-closed posts.
  @Cron('*/1 * * * *')
  async closeMissionPosts() {
    const now = new Date();

    const activePosts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        isDelete: 'no',
        postHide: 'no',
        type: { in: ['crowdfunding', 'support'] },
        raiseAmount: { not: null },
        start_time: { not: null },
        end_time: { gt: now },
      },
      select: {
        id: true,
        raiseAmount: true,
      },
    });

    let closedByTarget = 0;
    for (const post of activePosts) {
      const totalResult = await this.prisma.donationData.aggregate({
        where: {
          postId: post.id,
          action: 'missionDonation',
          status: 'completed',
        },
        _sum: { amount: true },
      });

      const totalRaised = totalResult._sum.amount ?? 0;
      const target = post.raiseAmount ?? 0;
      if (totalRaised < target) continue;

      const result = await this.prisma.post.updateMany({
        where: { id: post.id, end_time: { gt: now } },
        data: { end_time: now },
      });
      closedByTarget += result.count;
    }

    // Deadline-close is represented by end_time <= now.
    const closedByDeadline = await this.prisma.post.count({
      where: {
        deletedAt: null,
        isDelete: 'no',
        postHide: 'no',
        type: { in: ['crowdfunding', 'support'] },
        end_time: { lte: now },
      },
    });

    if (closedByTarget > 0 || closedByDeadline > 0) {
      this.logger.log(`Mission close run: targetClosed=${closedByTarget}, deadlineClosed=${closedByDeadline}`);
    }
  }
}

