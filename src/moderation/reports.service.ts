import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUniversalReportDto, GetReportsQueryDto, ReportStatusDtoEnum } from './dto/universal-report.dto';
import { ModerationCaseStatus, ModerationCategory, ModerationDecision, ReportReason, ReportStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a universal report for any content object or user (Spec Section 5)
   */
  async createReport(dto: CreateUniversalReportDto, reporterUserId: string) {
    const { content_id, content_type, feature, reported_user_id, reason_code, notes } = dto;

    if (reported_user_id && reported_user_id === reporterUserId) {
      throw new BadRequestException('You cannot report yourself');
    }

    // Determine priority based on safety risk
    let priority = 'NORMAL';
    let mappedCategory: ModerationCategory = ModerationCategory.OTHER;
    let severity = 1;

    switch (reason_code) {
      case 'CHILD_SAFETY':
        priority = 'CRITICAL';
        mappedCategory = ModerationCategory.CHILD_SAFETY;
        severity = 4;
        break;
      case 'THREATS_VIOLENCE':
        priority = 'HIGH';
        mappedCategory = ModerationCategory.VIOLENCE;
        severity = 3;
        break;
      case 'HATE_DISCRIMINATION':
        priority = 'HIGH';
        mappedCategory = ModerationCategory.HATE_SPEECH;
        severity = 3;
        break;
      case 'HARASSMENT':
        priority = 'NORMAL';
        mappedCategory = ModerationCategory.HARASSMENT;
        severity = 2;
        break;
      case 'SCAM_FRAUD':
        priority = 'NORMAL';
        mappedCategory = ModerationCategory.SCAM_FRAUD;
        severity = 2;
        break;
      case 'SEXUAL_EXPLOITATION':
        priority = 'HIGH';
        mappedCategory = ModerationCategory.SEXUAL_CONTENT;
        severity = 3;
        break;
      case 'SPAM_MANIPULATION':
        priority = 'LOW';
        mappedCategory = ModerationCategory.SPAM;
        severity = 1;
        break;
      default:
        priority = 'NORMAL';
        mappedCategory = ModerationCategory.OTHER;
        severity = 1;
        break;
    }

    // Check if an existing open case exists for this content
    let modCase = await (this.prisma as any).moderationCase.findFirst({
      where: {
        contentId: content_id,
        status: { in: [ModerationCaseStatus.OPEN, ModerationCaseStatus.IN_REVIEW] },
      },
    });

    if (!modCase) {
      // Create a moderation case routed to Trust & Safety
      modCase = await (this.prisma as any).moderationCase.create({
        data: {
          subjectUserId: reported_user_id || reporterUserId, // Fallback if author is unknown
          contentId: content_id,
          contentType: content_type.toUpperCase(),
          feature: feature.toLowerCase(),
          source: 'REPORT',
          category: mappedCategory,
          severity,
          reasonCode: `REPORT_${reason_code}`,
          automatedDecision: ModerationDecision.REVIEW,
          humanReviewRequired: true,
          status: ModerationCaseStatus.IN_REVIEW,
        },
      });
    } else {
      // Escalate existing case to human review
      await (this.prisma as any).moderationCase.update({
        where: { id: modCase.id },
        data: {
          humanReviewRequired: true,
          status: ModerationCaseStatus.IN_REVIEW,
          severity: Math.max(modCase.severity, severity),
        },
      });
    }

    // Create the Universal Report record
    const report = await (this.prisma as any).universalReport.create({
      data: {
        reporterUserId,
        reportedUserId: reported_user_id || null,
        contentId: content_id,
        contentType: content_type.toUpperCase(),
        feature: feature.toLowerCase(),
        reasonCode: reason_code as ReportReason,
        notes: notes || null,
        status: ReportStatus.RECEIVED,
        priority,
        moderationCaseId: modCase.id,
      },
    });

    // Also support legacy PostReport table if this was a POST for backward compatibility
    if (content_type.toUpperCase() === 'POST') {
      try {
        await (this.prisma as any).postReport.create({
          data: {
            postId: content_id,
            userId: reporterUserId,
            reason: `${reason_code}: ${notes || ''}`.trim(),
          },
        });
      } catch (err: any) {
        // Non-blocking legacy compatibility
      }
    }

    // Log to moderation audit log
    await (this.prisma as any).moderationAuditLog.create({
      data: {
        contentType: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'].includes(content_type.toUpperCase())
          ? content_type.toUpperCase()
          : 'POST',
        contentId: content_id,
        authorId: reported_user_id || reporterUserId,
        aiVerdict: 'PENDING_APPROVAL',
        aiReason: `User report submitted: ${reason_code}`,
        caseId: modCase.id,
        actorType: 'USER',
        action: 'REPORT_SUBMITTED',
        metadata: {
          reportId: report.id,
          reporterUserId,
          reasonCode: reason_code,
          priority,
        },
      },
    });

    return {
      message: 'Report submitted successfully. Thank you for helping keep Valens safe.',
      report_id: report.id,
      case_id: modCase.id,
      status: report.status,
      timestamp: report.createdAt,
    };
  }

  /**
   * Get all universal reports with filtering (Admin only)
   */
  async getReports(query: GetReportsQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status as ReportStatus;
    }
    if (query.priority) {
      where.priority = query.priority.toUpperCase();
    }
    if (query.feature) {
      where.feature = query.feature.toLowerCase();
    }

    const [reports, total] = await Promise.all([
      (this.prisma as any).universalReport.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, displayName: true, userName: true, image: true },
          },
          reportedUser: {
            select: { id: true, displayName: true, userName: true, image: true },
          },
          case: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      (this.prisma as any).universalReport.count({ where }),
    ]);

    return {
      items: reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
