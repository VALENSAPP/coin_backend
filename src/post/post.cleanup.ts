import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PostCleanupService {
  private readonly logger = new Logger(PostCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Every minute: report mission posts that are deadline-closed (end_time <= now).
  // Note: We intentionally do NOT auto-close early when target is reached.
  @Cron('*/1 * * * *')
  async closeMissionPosts() {
    const now = new Date();

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

    if (closedByDeadline > 0) {
      this.logger.log(`Mission close run: deadlineClosed=${closedByDeadline}`);
    }
  }

  // Every minute: send one warning when an active mission enters its final 24 hours.
  @Cron('*/1 * * * *')
  async warnMissionEndingSoon() {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const endingSoonPosts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        isDelete: 'no',
        postHide: 'no',
        type: { in: ['mission-post', 'crowdfunding', 'support'] },
        end_time: {
          gt: now,
          lte: next24Hours,
        },
      },
      select: { id: true },
      take: 100,
    });

    for (const post of endingSoonPosts) {
      try {
        await this.notificationService.sendMissionEndingSoonIfNeeded(post.id);
      } catch (error) {
        this.logger.error(`Failed to send mission ending soon notification for post ${post.id}:`, error);
      }
    }

    if (endingSoonPosts.length > 0) {
      this.logger.log(`Mission ending soon run: checked=${endingSoonPosts.length}`);
    }
  }
}
