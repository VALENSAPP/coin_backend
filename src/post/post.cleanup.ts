import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostCleanupService {
  private readonly logger = new Logger(PostCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
