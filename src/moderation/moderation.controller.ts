import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ModerationService } from './moderation.service';
import { ModerationCheckDto } from './dto/moderation-check.dto';
import { CreateAppealDto } from './dto/appeal.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationCaseStatus } from '@prisma/client';

@ApiTags('Trust & Safety - Central Moderation')
@Controller('v1/moderation')
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('check')
  @ApiOperation({
    summary: 'Central content moderation check API',
    description:
      'Submits content to the central Trust & Safety Policy Engine and returns a normalized decision (ALLOW | WARN | BLOCK | REVIEW).',
  })
  async checkContent(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ModerationCheckDto,
  ) {
    return this.moderationService.checkContent(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('cases/:caseId/appeal')
  @ApiOperation({
    summary: 'Submit an appeal for a moderation decision or restriction',
    description:
      'Allows a user to provide a short explanation to contest a moderation action, routing it to the Appeals review queue.',
  })
  @ApiParam({ name: 'caseId', description: 'ID of the moderation case' })
  async appealCase(
    @Req() req: Request,
    @Param('caseId') caseId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateAppealDto,
  ) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) {
      throw new ForbiddenException('User authentication required');
    }

    const modCase = await (this.prisma as any).moderationCase.findUnique({
      where: { id: caseId },
    });

    if (!modCase) {
      throw new NotFoundException(`Moderation case ${caseId} not found`);
    }

    if (modCase.subjectUserId !== userId) {
      throw new ForbiddenException('You can only appeal moderation actions taken against your own content or account');
    }

    if (modCase.appealStatus === 'SUBMITTED') {
      throw new BadRequestException('An appeal has already been submitted for this case');
    }

    const updatedCase = await (this.prisma as any).moderationCase.update({
      where: { id: caseId },
      data: {
        appealStatus: 'SUBMITTED',
        appealReason: dto.reason,
        appealedAt: new Date(),
        status: ModerationCaseStatus.APPEALED,
      },
    });

    // Mark associated account violations as appealed
    await (this.prisma as any).accountViolation.updateMany({
      where: { caseId },
      data: { appealed: true },
    });

    // Audit log
    await (this.prisma as any).moderationAuditLog.create({
      data: {
        contentType: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'].includes(modCase.contentType)
          ? modCase.contentType
          : 'POST',
        contentId: modCase.contentId || caseId,
        authorId: userId,
        aiVerdict: 'PENDING_APPROVAL',
        aiReason: `Appeal submitted by user: "${dto.reason}"`,
        caseId,
        actorType: 'USER',
        action: 'APPEAL_SUBMITTED',
        metadata: {
          appealReason: dto.reason,
        },
      },
    });

    return {
      message: 'Appeal submitted successfully and routed to Trust & Safety reviewers.',
      caseId: updatedCase.id,
      appealStatus: updatedCase.appealStatus,
      appealedAt: updatedCase.appealedAt,
    };
  }
}
