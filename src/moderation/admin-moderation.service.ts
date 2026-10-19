import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  AdminCaseActionEnum,
  AdminQueueTypeEnum,
  AppealVerdictDto,
  AppealVerdictEnum,
  ApplyCaseActionDto,
  ApproveContentDto,
  GetCasesQueryDto,
  GetModerationQueueDto,
  ModerationContentTypeEnum,
  RejectContentDto,
} from './dto/admin-moderation.dto';
import {
  AccountStanding,
  AccountViolationAction,
  ModerationCaseStatus,
  ModerationCategory,
  ModerationDecision,
  ReportStatus,
} from '@prisma/client';

@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get Moderation Cases with multi-queue filtering (Spec Section 9)
   */
  async getCases(dto: GetCasesQueryDto) {
    const page = Math.max(Number(dto.page) || 1, 1);
    const limit = Math.min(Math.max(Number(dto.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    switch (dto.queue) {
      case AdminQueueTypeEnum.AI_FLAGGED:
        where.source = 'AUTOMATED';
        where.status = { in: [ModerationCaseStatus.OPEN, ModerationCaseStatus.IN_REVIEW] };
        break;
      case AdminQueueTypeEnum.REPORTS:
        where.source = 'REPORT';
        break;
      case AdminQueueTypeEnum.CRITICAL:
        where.OR = [{ severity: 4 }, { category: ModerationCategory.CHILD_SAFETY }];
        break;
      case AdminQueueTypeEnum.APPEALS:
        where.OR = [
          { status: ModerationCaseStatus.APPEALED },
          { appealStatus: 'SUBMITTED' },
        ];
        break;
      case AdminQueueTypeEnum.SUSPENDED_USERS:
        where.subjectUser = { accountStanding: AccountStanding.SUSPENDED };
        break;
      case AdminQueueTypeEnum.BANNED_USERS:
        where.subjectUser = { accountStanding: AccountStanding.BANNED };
        break;
      case AdminQueueTypeEnum.MARKETPLACE:
        where.feature = 'marketplace';
        break;
      case AdminQueueTypeEnum.CHILD_SAFETY:
        where.category = ModerationCategory.CHILD_SAFETY;
        break;
      case AdminQueueTypeEnum.ALL:
      default:
        break;
    }

    if (dto.feature) {
      where.feature = dto.feature.toLowerCase();
    }

    if (dto.search) {
      where.OR = [
        ...(where.OR || []),
        { reasonCode: { contains: dto.search, mode: 'insensitive' } },
        { subjectUserId: { contains: dto.search, mode: 'insensitive' } },
        { contentId: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await Promise.all([
      (this.prisma as any).moderationCase.findMany({
        where,
        include: {
          subjectUser: {
            select: {
              id: true,
              displayName: true,
              userName: true,
              image: true,
              accountStanding: true,
              standingStrikeCount: true,
              standingWarningCount: true,
            },
          },
          reports: {
            select: {
              id: true,
              reasonCode: true,
              notes: true,
              priority: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      (this.prisma as any).moderationCase.count({ where }),
    ]);

    return {
      cases,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get comprehensive details for a specific moderation case
   */
  async getCaseDetails(caseId: string) {
    const modCase = await (this.prisma as any).moderationCase.findUnique({
      where: { id: caseId },
      include: {
        subjectUser: {
          select: {
            id: true,
            displayName: true,
            userName: true,
            image: true,
            email: true,
            accountStanding: true,
            standingStrikeCount: true,
            standingWarningCount: true,
            standingUntil: true,
            isBlocked: true,
            createdAt: true,
          },
        },
        reports: {
          include: {
            reporter: {
              select: { id: true, displayName: true, userName: true, image: true },
            },
          },
        },
        violations: true,
      },
    });

    if (!modCase) {
      throw new NotFoundException(`Moderation case ${caseId} not found`);
    }

    // Fetch prior violations of the subject user
    const priorViolations = await (this.prisma as any).accountViolation.findMany({
      where: { userId: modCase.subjectUserId, caseId: { not: caseId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Fetch audit history for this case
    const auditLogs = await (this.prisma as any).moderationAuditLog.findMany({
      where: {
        OR: [
          { caseId },
          { contentId: modCase.contentId || '' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Retrieve underlying content object if available
    let contentSnapshot: any = null;
    if (modCase.contentId) {
      try {
        if (modCase.contentType === 'POST') {
          contentSnapshot = await (this.prisma as any).post.findUnique({
            where: { id: modCase.contentId },
          });
        } else if (modCase.contentType === 'COMMENT') {
          contentSnapshot = await (this.prisma as any).postComment.findUnique({
            where: { id: modCase.contentId },
          });
        } else if (modCase.contentType === 'PRODUCT') {
          contentSnapshot = await (this.prisma as any).closetItems.findUnique({
            where: { id: modCase.contentId },
          });
        } else if (modCase.contentType === 'EBOOK') {
          contentSnapshot = await (this.prisma as any).shopEbook.findUnique({
            where: { id: modCase.contentId },
          });
        }
      } catch (e: any) {
        // Content might have been purged
      }
    }

    return {
      case: modCase,
      contentSnapshot,
      priorViolations,
      auditLogs,
    };
  }

  /**
   * Apply granular moderator action to a case (Spec Section 9)
   * Actions: NO_VIOLATION | REMOVE | WARNING | STRIKE | FEATURE_RESTRICTION | SUSPENSION_24H | SUSPENSION_7D | SUSPENSION_30D | PERMANENT_BAN | ESCALATE
   */
  async applyCaseAction(caseId: string, dto: ApplyCaseActionDto, adminUserId: string) {
    const modCase = await (this.prisma as any).moderationCase.findUnique({
      where: { id: caseId },
    });

    if (!modCase) {
      throw new NotFoundException(`Moderation case ${caseId} not found`);
    }

    const { action, notes, reasonCode, restrictionScope } = dto;
    const now = new Date();
    const finalReason = reasonCode || modCase.reasonCode || 'Community guidelines violation';

    let newCaseStatus: ModerationCaseStatus = ModerationCaseStatus.ACTIONED;
    let finalDecision: ModerationDecision = ModerationDecision.BLOCK;
    let userStandingUpdate: AccountStanding | null = null;
    let standingUntil: Date | null = null;
    let violationAction: AccountViolationAction | null = null;

    switch (action) {
      case AdminCaseActionEnum.NO_VIOLATION:
        newCaseStatus = ModerationCaseStatus.RESOLVED;
        finalDecision = ModerationDecision.ALLOW;
        // Restore content if applicable
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'APPROVED', adminUserId);
        break;

      case AdminCaseActionEnum.REMOVE:
        finalDecision = ModerationDecision.BLOCK;
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        break;

      case AdminCaseActionEnum.WARNING:
        finalDecision = ModerationDecision.WARN;
        violationAction = AccountViolationAction.WARNING;
        userStandingUpdate = AccountStanding.WARNING;
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        await (this.prisma as any).user.update({
          where: { id: modCase.subjectUserId },
          data: {
            standingWarningCount: { increment: 1 },
            accountStanding: AccountStanding.WARNING,
            standingReason: finalReason,
          },
        });
        break;

      case AdminCaseActionEnum.STRIKE:
        finalDecision = ModerationDecision.BLOCK;
        violationAction = AccountViolationAction.STRIKE;
        userStandingUpdate = AccountStanding.RESTRICTED;
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        await (this.prisma as any).user.update({
          where: { id: modCase.subjectUserId },
          data: {
            standingStrikeCount: { increment: 1 },
            accountStanding: AccountStanding.RESTRICTED,
            standingReason: finalReason,
          },
        });
        break;

      case AdminCaseActionEnum.FEATURE_RESTRICTION:
        finalDecision = ModerationDecision.BLOCK;
        violationAction = AccountViolationAction.FEATURE_RESTRICTION;
        userStandingUpdate = AccountStanding.RESTRICTED;
        standingUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        await (this.prisma as any).user.update({
          where: { id: modCase.subjectUserId },
          data: {
            accountStanding: AccountStanding.RESTRICTED,
            standingUntil,
            standingReason: `Restricted: ${restrictionScope || 'GENERAL'}`,
          },
        });
        break;

      case AdminCaseActionEnum.SUSPENSION_24H:
        finalDecision = ModerationDecision.BLOCK;
        violationAction = AccountViolationAction.SUSPENSION_24H;
        userStandingUpdate = AccountStanding.SUSPENDED;
        standingUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        await (this.prisma as any).user.update({
          where: { id: modCase.subjectUserId },
          data: {
            accountStanding: AccountStanding.SUSPENDED,
            standingUntil,
            bannedUntil: standingUntil,
            standingReason: '24-hour account suspension',
          },
        });
        break;

      case AdminCaseActionEnum.SUSPENSION_7D:
        finalDecision = ModerationDecision.BLOCK;
        violationAction = AccountViolationAction.SUSPENSION_7D;
        userStandingUpdate = AccountStanding.SUSPENDED;
        standingUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        await (this.prisma as any).user.update({
          where: { id: modCase.subjectUserId },
          data: {
            accountStanding: AccountStanding.SUSPENDED,
            standingUntil,
            bannedUntil: standingUntil,
            standingReason: '7-day account suspension',
          },
        });
        break;

      case AdminCaseActionEnum.SUSPENSION_30D:
        finalDecision = ModerationDecision.BLOCK;
        violationAction = AccountViolationAction.SUSPENSION_30D;
        userStandingUpdate = AccountStanding.SUSPENDED;
        standingUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        await (this.prisma as any).user.update({
          where: { id: modCase.subjectUserId },
          data: {
            accountStanding: AccountStanding.SUSPENDED,
            standingUntil,
            bannedUntil: standingUntil,
            standingReason: '30-day account suspension',
          },
        });
        break;

      case AdminCaseActionEnum.PERMANENT_BAN:
        finalDecision = ModerationDecision.BLOCK;
        violationAction = AccountViolationAction.PERMANENT_BAN;
        userStandingUpdate = AccountStanding.BANNED;
        await this.setContentStatus(modCase.contentType, modCase.contentId, 'REJECTED', adminUserId, finalReason);
        await (this.prisma as any).user.update({
          where: { id: modCase.subjectUserId },
          data: {
            accountStanding: AccountStanding.BANNED,
            isBlocked: true,
            blockedReason: finalReason,
            blockedAt: now,
          },
        });
        break;

      case AdminCaseActionEnum.ESCALATE:
        newCaseStatus = ModerationCaseStatus.IN_REVIEW;
        await (this.prisma as any).moderationCase.update({
          where: { id: caseId },
          data: {
            severity: 4,
            humanReviewRequired: true,
            moderatorNotes: notes ? `ESCALATED: ${notes}` : 'ESCALATED to senior review',
          },
        });
        return {
          message: 'Case escalated to high-priority review queue',
          caseId,
          severity: 4,
        };
    }

    // Record violation record if applicable
    if (violationAction) {
      await (this.prisma as any).accountViolation.create({
        data: {
          userId: modCase.subjectUserId,
          caseId,
          category: modCase.category || ModerationCategory.OTHER,
          severity: modCase.severity || 1,
          reasonCode: finalReason,
          action: violationAction,
          restrictionScope: restrictionScope || null,
          restrictionStart: now,
          restrictionEnd: standingUntil,
        },
      });
    }

    // Update case status
    const updatedCase = await (this.prisma as any).moderationCase.update({
      where: { id: caseId },
      data: {
        status: newCaseStatus,
        finalDecision,
        moderatorId: adminUserId,
        moderatorNotes: notes || null,
        resolvedAt: now,
      },
    });

    // Mark associated reports as ACTIONED or NO_VIOLATION
    await (this.prisma as any).universalReport.updateMany({
      where: { moderationCaseId: caseId },
      data: {
        status: action === AdminCaseActionEnum.NO_VIOLATION ? ReportStatus.NO_VIOLATION : ReportStatus.ACTIONED,
        resolvedAt: now,
        moderatorNotes: notes || null,
      },
    });

    // Record audit log
    await (this.prisma as any).moderationAuditLog.create({
      data: {
        contentType: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'].includes(modCase.contentType)
          ? modCase.contentType
          : 'POST',
        contentId: modCase.contentId || caseId,
        authorId: modCase.subjectUserId,
        aiVerdict: modCase.automatedDecision === 'ALLOW' ? 'APPROVED' : 'PENDING_APPROVAL',
        adminAction: action === AdminCaseActionEnum.NO_VIOLATION ? 'APPROVED' : 'REJECTED',
        adminReason: notes || action,
        adminId: adminUserId,
        caseId,
        actorType: 'ADMIN',
        action,
        metadata: {
          actionTaken: action,
          standingUpdate: userStandingUpdate,
          standingUntil,
          notes,
        },
      },
    });

    return {
      message: `Action ${action} applied successfully to case ${caseId}`,
      caseId,
      status: updatedCase.status,
      finalDecision: updatedCase.finalDecision,
      userStanding: userStandingUpdate || 'UNCHANGED',
    };
  }

  /**
   * Resolve an appeal for a case (Spec Section 10)
   * OVERTURN restores content and recalculates user standing; UPHOLD confirms rejection.
   */
  async resolveAppeal(caseId: string, dto: AppealVerdictDto, adminUserId: string) {
    const modCase = await (this.prisma as any).moderationCase.findUnique({
      where: { id: caseId },
      include: { violations: true },
    });

    if (!modCase) {
      throw new NotFoundException(`Moderation case ${caseId} not found`);
    }

    const { verdict, notes } = dto;
    const now = new Date();

    if (verdict === AppealVerdictEnum.OVERTURN) {
      // 1. Restore content
      await this.setContentStatus(modCase.contentType, modCase.contentId, 'APPROVED', adminUserId);

      // 2. Mark violations as overturned
      await (this.prisma as any).accountViolation.updateMany({
        where: { caseId },
        data: {
          overturned: true,
          overturnedReason: notes || 'Appeal approved; action reversed.',
          overturnedAt: now,
        },
      });

      // 3. Recalculate subject user's standing
      await (this.prisma as any).user.update({
        where: { id: modCase.subjectUserId },
        data: {
          accountStanding: AccountStanding.GOOD,
          standingUntil: null,
          standingReason: null,
          isBlocked: false,
          blockedReason: null,
          standingStrikeCount: { decrement: modCase.violations.length > 0 ? 1 : 0 },
        },
      });

      // 4. Update case
      await (this.prisma as any).moderationCase.update({
        where: { id: caseId },
        data: {
          appealStatus: 'OVERTURNED',
          status: ModerationCaseStatus.RESOLVED,
          finalDecision: ModerationDecision.ALLOW,
          moderatorNotes: notes ? `APPEAL OVERTURNED: ${notes}` : 'Appeal granted',
          resolvedAt: now,
        },
      });
    } else {
      // UPHOLD
      await (this.prisma as any).moderationCase.update({
        where: { id: caseId },
        data: {
          appealStatus: 'UPHELD',
          status: ModerationCaseStatus.CLOSED,
          moderatorNotes: notes ? `APPEAL REJECTED: ${notes}` : 'Appeal dismissed upon secondary review',
          resolvedAt: now,
        },
      });
    }

    // Audit log
    await (this.prisma as any).moderationAuditLog.create({
      data: {
        contentType: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'].includes(modCase.contentType)
          ? modCase.contentType
          : 'POST',
        contentId: modCase.contentId || caseId,
        authorId: modCase.subjectUserId,
        aiVerdict: 'PENDING_APPROVAL',
        adminAction: verdict === AppealVerdictEnum.OVERTURN ? 'APPROVED' : 'REJECTED',
        adminReason: `Appeal verdict: ${verdict}. ${notes || ''}`,
        adminId: adminUserId,
        caseId,
        actorType: 'ADMIN',
        action: `APPEAL_${verdict}`,
        metadata: {
          appealVerdict: verdict,
          notes,
        },
      },
    });

    return {
      message: `Appeal verdict '${verdict}' recorded successfully.`,
      caseId,
      verdict,
      resolvedAt: now,
    };
  }

  /**
   * Helper to set content status across models
   */
  private async setContentStatus(
    contentType?: string | null,
    contentId?: string | null,
    status: 'APPROVED' | 'REJECTED' = 'APPROVED',
    adminUserId?: string,
    reason?: string,
  ) {
    if (!contentType || !contentId) return;
    const type = contentType.toUpperCase();
    const now = new Date();

    try {
      if (type === 'POST') {
        await (this.prisma as any).post.update({
          where: { id: contentId },
          data: {
            moderationStatus: status,
            moderatedBy: adminUserId,
            moderatedAt: now,
            ...(reason ? { moderationReason: reason } : {}),
          },
        });
      } else if (type === 'COMMENT') {
        await (this.prisma as any).postComment.update({
          where: { id: contentId },
          data: {
            moderationStatus: status,
            moderatedBy: adminUserId,
            moderatedAt: now,
            ...(reason ? { moderationReason: reason } : {}),
          },
        });
      } else if (type === 'PRODUCT') {
        await (this.prisma as any).closetItems.update({
          where: { id: contentId },
          data: {
            moderationStatus: status,
            moderatedBy: adminUserId,
            moderatedAt: now,
            ...(reason ? { moderationReason: reason } : {}),
          },
        });
      } else if (type === 'EBOOK') {
        await (this.prisma as any).shopEbook.update({
          where: { id: contentId },
          data: {
            moderationStatus: status,
            moderatedBy: adminUserId,
            moderatedAt: now,
            ...(reason ? { moderationReason: reason } : {}),
          },
        });
      }
    } catch (err: any) {
      // Content may already be deleted
    }
  }

  /**
   * Legacy queue: Get paginated pending items (Maintained for backward compatibility)
   */
  async getPendingQueue(dto: GetModerationQueueDto) {
    const page = Math.max(Number(dto.page) || 1, 1);
    const limit = Math.min(Math.max(Number(dto.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const type = dto.type || ModerationContentTypeEnum.ALL;

    const results: any[] = [];

    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.POST) {
      const posts = await (this.prisma as any).post.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          isDelete: 'no',
          deletedAt: null,
          ...(dto.search
            ? {
                OR: [
                  { text: { contains: dto.search, mode: 'insensitive' } },
                  { caption: { contains: dto.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      posts.forEach((p: any) => {
        results.push({
          contentType: 'POST',
          contentId: p.id,
          title: p.caption || p.text?.slice(0, 50) || 'Post',
          content: p.text || p.caption || '',
          images: p.images || [],
          postType: p.type,
          format: p.format,
          moderationStatus: p.moderationStatus,
          moderationReason: p.moderationReason,
          moderationScore: p.moderationScore,
          moderatedBy: p.moderatedBy,
          createdAt: p.createdAt,
          author: p.user,
        });
      });
    }

    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.COMMENT) {
      const comments = await (this.prisma as any).postComment.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          ...(dto.search
            ? { comment: { contains: dto.search, mode: 'insensitive' } }
            : {}),
        },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          post: { select: { id: true, text: true, caption: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      comments.forEach((c: any) => {
        results.push({
          contentType: 'COMMENT',
          contentId: c.id,
          title: `Comment on post (${c.postId})`,
          content: c.comment,
          parentPost: c.post,
          moderationStatus: c.moderationStatus,
          moderationReason: c.moderationReason,
          moderationScore: c.moderationScore,
          moderatedBy: c.moderatedBy,
          createdAt: c.createdAt,
          author: c.user,
        });
      });
    }

    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.PRODUCT) {
      const products = await (this.prisma as any).closetItems.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          isDeleted: false,
          ...(dto.search
            ? {
                OR: [
                  { name: { contains: dto.search, mode: 'insensitive' } },
                  { description: { contains: dto.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          closet: { select: { id: true, shopName: true, shopUsername: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      products.forEach((pr: any) => {
        results.push({
          contentType: 'PRODUCT',
          contentId: pr.id,
          title: pr.name,
          content: pr.description || '',
          images: pr.images || [],
          price: pr.price,
          category: pr.category,
          moderationStatus: pr.moderationStatus,
          moderationReason: pr.moderationReason,
          moderationScore: pr.moderationScore,
          moderatedBy: pr.moderatedBy,
          createdAt: pr.createdAt,
          author: pr.user,
          shop: pr.closet,
        });
      });
    }

    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.EBOOK) {
      const ebooks = await (this.prisma as any).shopEbook.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          ...(dto.search
            ? {
                OR: [
                  { caption: { contains: dto.search, mode: 'insensitive' } },
                  { text: { contains: dto.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          closet: { select: { id: true, shopName: true, shopUsername: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      ebooks.forEach((eb: any) => {
        results.push({
          contentType: 'EBOOK',
          contentId: eb.id,
          title: eb.caption || eb.text || 'Shop Ebook',
          content: eb.text || '',
          images: eb.images || [],
          ebookpdf: eb.ebookpdf,
          amount: eb.amount,
          moderationStatus: eb.moderationStatus,
          moderationReason: eb.moderationReason,
          moderationScore: eb.moderationScore,
          moderatedBy: eb.moderatedBy,
          createdAt: eb.createdAt,
          author: eb.user,
          shop: eb.closet,
        });
      });
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = results.length;
    const paginatedItems = results.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
    };
  }

  /**
   * Legacy item details
   */
  async getItemDetails(contentType: string, contentId: string) {
    const normalizedType = contentType.toUpperCase();
    let item: any = null;
    let authorId: string | null = null;

    if (normalizedType === 'POST') {
      item = await (this.prisma as any).post.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
        },
      });
      authorId = item?.userId;
    } else if (normalizedType === 'COMMENT') {
      item = await (this.prisma as any).postComment.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          post: true,
        },
      });
      authorId = item?.userId;
    } else if (normalizedType === 'PRODUCT') {
      item = await (this.prisma as any).closetItems.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          closet: true,
        },
      });
      authorId = item?.userId;
    } else if (normalizedType === 'EBOOK') {
      item = await (this.prisma as any).shopEbook.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          closet: true,
        },
      });
      authorId = item?.userId;
    }

    if (!item) {
      throw new NotFoundException(`${contentType} with ID ${contentId} not found`);
    }

    const logs = await (this.prisma as any).moderationAuditLog.findMany({
      where: { contentId, contentType: normalizedType },
      orderBy: { createdAt: 'desc' },
    });

    return {
      contentType: normalizedType,
      contentId,
      item,
      authorId,
      auditLogs: logs,
    };
  }

  /**
   * Legacy: Admin approves item
   */
  async approveItem(dto: ApproveContentDto, adminUserId: string) {
    await this.setContentStatus(dto.contentType, dto.contentId, 'APPROVED', adminUserId);

    await (this.prisma as any).moderationAuditLog.create({
      data: {
        contentType: dto.contentType,
        contentId: dto.contentId,
        authorId: adminUserId,
        aiVerdict: 'APPROVED',
        adminAction: 'APPROVED',
        adminReason: dto.notes || 'Approved by admin',
        adminId: adminUserId,
      },
    });

    return {
      message: `${dto.contentType} approved successfully and is now publicly visible`,
      contentId: dto.contentId,
      status: 'APPROVED',
    };
  }

  /**
   * Legacy: Admin rejects item
   */
  async rejectItem(dto: RejectContentDto, adminUserId: string) {
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Rejection reason is required');
    }

    await this.setContentStatus(dto.contentType, dto.contentId, 'REJECTED', adminUserId, dto.reason.trim());

    await (this.prisma as any).moderationAuditLog.create({
      data: {
        contentType: dto.contentType,
        contentId: dto.contentId,
        authorId: adminUserId,
        aiVerdict: 'REJECTED',
        adminAction: 'REJECTED',
        adminReason: dto.reason.trim(),
        adminId: adminUserId,
      },
    });

    return {
      message: `${dto.contentType} rejected successfully`,
      contentId: dto.contentId,
      status: 'REJECTED',
      reason: dto.reason,
    };
  }

  /**
   * Comprehensive moderation statistics
   */
  async getStats() {
    const [
      pendingPosts,
      approvedPosts,
      rejectedPosts,
      pendingComments,
      pendingProducts,
      pendingEbooks,
      totalCases,
      openCases,
      criticalCases,
      appealedCases,
      totalReports,
    ] = await Promise.all([
      (this.prisma as any).post.count({ where: { moderationStatus: 'PENDING_APPROVAL', isDelete: 'no', deletedAt: null } }),
      (this.prisma as any).post.count({ where: { moderationStatus: 'APPROVED', isDelete: 'no', deletedAt: null } }),
      (this.prisma as any).post.count({ where: { moderationStatus: 'REJECTED', isDelete: 'no', deletedAt: null } }),
      (this.prisma as any).postComment.count({ where: { moderationStatus: 'PENDING_APPROVAL' } }),
      (this.prisma as any).closetItems.count({ where: { moderationStatus: 'PENDING_APPROVAL', isDeleted: false } }),
      (this.prisma as any).shopEbook.count({ where: { moderationStatus: 'PENDING_APPROVAL' } }),
      (this.prisma as any).moderationCase.count(),
      (this.prisma as any).moderationCase.count({ where: { status: { in: [ModerationCaseStatus.OPEN, ModerationCaseStatus.IN_REVIEW] } } }),
      (this.prisma as any).moderationCase.count({ where: { severity: 4 } }),
      (this.prisma as any).moderationCase.count({ where: { appealStatus: 'SUBMITTED' } }),
      (this.prisma as any).universalReport.count(),
    ]);

    const totalPending = pendingPosts + pendingComments + pendingProducts + pendingEbooks;

    return {
      totalPending,
      pendingPosts,
      approvedPosts,
      rejectedPosts,
      pendingComments,
      pendingProducts,
      pendingEbooks,
      // T&S Architecture Metrics
      cases: {
        total: totalCases,
        open: openCases,
        critical: criticalCases,
        appealsPending: appealedCases,
      },
      reports: {
        total: totalReports,
      },
    };
  }
}
