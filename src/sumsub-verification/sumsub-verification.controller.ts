import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SumsubVerificationService } from './sumsub-verification.service';

@ApiTags('sumsub-verification')
@Controller('sumsub-verification')
export class SumsubVerificationController {
  constructor(private readonly sumsubVerificationService: SumsubVerificationService) { }

  @Post('start')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start company document verification (SumSub SDK token)' })
  async startVerification(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.sumsubVerificationService.startVerification(userId);
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current document verification status' })
  async getStatus(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.sumsubVerificationService.getStatus(userId);
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  async webhook(@Req() req: Request, @Body() body: any) {
    // console.log('🔔 [Sumsub Company] Webhook called');
    const raw = (req as any).rawBody ?? (Buffer.isBuffer(req.body) ? req.body : null);
    const rawStr = raw ? (typeof raw === 'string' ? raw : raw.toString('utf8')) : null;
    const payload = rawStr ? JSON.parse(rawStr) : body;
    // console.log('📨 [Sumsub Company] Payload:', JSON.stringify(payload, null, 2));
    const signature = (req.headers['x-payload-digest'] as string) || (req.headers['x-sumsub-signature'] as string) || '';
    if (signature && rawStr) {
      const isValid = this.sumsubVerificationService.verifyWebhookSignature(rawStr, signature);
      if (!isValid) throw new BadRequestException('Invalid webhook signature');
      // console.log('✅ [Sumsub Company] Signature verified');
    }
    await this.sumsubVerificationService.handleWebhook(payload);
    // console.log('✅ [Sumsub Company] Webhook handled successfully');
    return { ok: true };
  }
}
