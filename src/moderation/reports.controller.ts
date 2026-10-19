import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { CreateUniversalReportDto, GetReportsQueryDto } from './dto/universal-report.dto';

@ApiTags('Trust & Safety - Reporting System')
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Submit a report on any content object or user',
    description:
      'Universal report endpoint for posts, comments, battles, products, DMs, or accounts across Valens.',
  })
  async createReport(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateUniversalReportDto,
  ) {
    const reporterUserId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.reportsService.createReport(dto, reporterUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Get list of universal reports (Admin)',
    description: 'Returns paginated reports with filtering by status, priority, and feature.',
  })
  async getReports(
    @Query(new ValidationPipe({ whitelist: true, transform: true })) query: GetReportsQueryDto,
  ) {
    return this.reportsService.getReports(query);
  }
}
