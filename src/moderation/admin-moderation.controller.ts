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
  ApproveContentDto,
  GetModerationQueueDto,
  RejectContentDto,
} from './dto/admin-moderation.dto';

@ApiTags('Admin Moderation')
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private readonly adminModerationService: AdminModerationService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('queue')
  @ApiOperation({ summary: 'Get pending items in the AI moderation queue' })
  async getPendingQueue(
    @Query(new ValidationPipe({ whitelist: true, transform: true })) query: GetModerationQueueDto,
  ) {
    return this.adminModerationService.getPendingQueue(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('item/:type/:id')
  @ApiOperation({ summary: 'Get details and audit log for a specific moderated item' })
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
  @ApiOperation({ summary: 'Admin approves a flagged item to make it publicly visible' })
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
  @ApiOperation({ summary: 'Admin rejects a flagged item' })
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
