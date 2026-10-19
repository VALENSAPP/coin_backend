import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminModerationService } from './admin-moderation.service';
import {
  AppealVerdictDto,
  ApplyCaseActionDto,
  ApproveContentDto,
  GetCasesQueryDto,
  GetModerationQueueDto,
  RejectContentDto,
} from './dto/admin-moderation.dto';

@ApiTags('Admin Moderation & Trust & Safety Dashboard')
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private readonly adminModerationService: AdminModerationService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('cases')
  @ApiOperation({
    summary: 'Get moderation cases across specialized queues',
    description:
      'Filter cases by queue (ALL, AI_FLAGGED, REPORTS, CRITICAL, APPEALS, SUSPENDED_USERS, BANNED_USERS, MARKETPLACE, CHILD_SAFETY).',
  })
  async getCases(
    @Query(new ValidationPipe({ whitelist: true, transform: true })) query: GetCasesQueryDto,
  ) {
    return this.adminModerationService.getCases(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('cases/:caseId')
  @ApiOperation({
    summary: 'Get comprehensive details of a moderation case',
    description:
      'Returns case data, content snapshot, author details, associated reports, past violations, and audit history.',
  })
  @ApiParam({ name: 'caseId', description: 'ID of the moderation case' })
  async getCaseDetails(@Param('caseId') caseId: string) {
    return this.adminModerationService.getCaseDetails(caseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('cases/:caseId/action')
  @ApiOperation({
    summary: 'Apply an enforcement action to a moderation case',
    description:
      'Actions: NO_VIOLATION | REMOVE | WARNING | STRIKE | FEATURE_RESTRICTION | SUSPENSION_24H | SUSPENSION_7D | SUSPENSION_30D | PERMANENT_BAN | ESCALATE.',
  })
  @ApiParam({ name: 'caseId', description: 'ID of the moderation case' })
  async applyCaseAction(
    @Req() req: Request,
    @Param('caseId') caseId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ApplyCaseActionDto,
  ) {
    const adminUserId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.adminModerationService.applyCaseAction(caseId, dto, adminUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('cases/:caseId/appeal-verdict')
  @ApiOperation({
    summary: 'Resolve an appeal for a moderation case',
    description:
      'OVERTURN restores content and recalculates user standing; UPHOLD confirms the restriction.',
  })
  @ApiParam({ name: 'caseId', description: 'ID of the moderation case' })
  async resolveAppeal(
    @Req() req: Request,
    @Param('caseId') caseId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AppealVerdictDto,
  ) {
    const adminUserId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.adminModerationService.resolveAppeal(caseId, dto, adminUserId);
  }

  // --- Legacy Endpoints (Maintained for Backward Compatibility) ---

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('queue')
  @ApiOperation({ summary: 'Get pending items in the AI moderation queue (Legacy)' })
  async getPendingQueue(
    @Query(new ValidationPipe({ whitelist: true, transform: true })) query: GetModerationQueueDto,
  ) {
    return this.adminModerationService.getPendingQueue(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('item/:type/:id')
  @ApiOperation({ summary: 'Get details and audit log for a specific moderated item (Legacy)' })
  @ApiParam({ name: 'type', enum: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'] })
  @ApiParam({ name: 'id', type: String })
  async getItemDetails(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.adminModerationService.getItemDetails(type, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('approve')
  @ApiOperation({ summary: 'Admin approves a flagged item to make it publicly visible (Legacy)' })
  async approveItem(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ApproveContentDto,
  ) {
    const adminUserId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.adminModerationService.approveItem(dto, adminUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('reject')
  @ApiOperation({ summary: 'Admin rejects a flagged item (Legacy)' })
  async rejectItem(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: RejectContentDto,
  ) {
    const adminUserId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.adminModerationService.rejectItem(dto, adminUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('stats')
  @ApiOperation({ summary: 'Get moderation system statistics' })
  async getStats() {
    return this.adminModerationService.getStats();
  }
}
