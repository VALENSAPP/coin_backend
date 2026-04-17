import { Controller, Post, Body, Param, Get, Req, Query, Res } from '@nestjs/common';
import { KycService } from './kyc.service';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { VeriffWebhookDto } from './dto/webhook.dto';
import { Response } from 'express';

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('start/:userId')
  @ApiOperation({ summary: 'Start KYC verification' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ schema: { 
      type: 'object', 
      properties: { 
        documentType: { type: 'string', example: 'DRIVERS_LICENSE' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' }
      } 
    } 
  })
  @ApiResponse({ status: 201, description: 'Veriff session created successfully' })
  async startKyc(
    @Param('userId') userId: string,
    @Body('documentType') documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'ID_CARD',
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
  ) {
    return this.kycService.createVeriffSession(
      userId,
      documentType,
      firstName,
      lastName,
    );
  }

  // @Post('webhook')
  // @ApiOperation({ summary: 'Veriff Webhook' })
  // @ApiBody({ type: VeriffWebhookDto })
  // @ApiResponse({ status: 200, description: 'Webhook handled successfully' })
  // async webhook(@Body() body: VeriffWebhookDto) {
  //     console.log('🔔 Veriff Webhook Received:', JSON.stringify(body, null, 2));
  //   return this.kycService.handleWebhook(body);
  // }

@Post('webhook')
async handleWebhook(@Req() req: any) {
  let body = req.body;

  // If body is a buffer (raw), parse it as JSON
  if (Buffer.isBuffer(body)) {
    body = JSON.parse(body.toString());
  }

  console.log('📨 RAW VERIFF PAYLOAD:', JSON.stringify(body, null, 2));

  // handle both formats safely
  const verification = body.resource || body.verification || body;
  console.log('✅ Extracted verification object:', JSON.stringify(verification, null, 2));

  const id = verification?.id;
  const action = verification?.action;
  const code = verification?.code;
  console.log(`🔍 Webhook data - ID: ${id}, Action: ${action}, Code: ${code}`);

  if (!id) {
    console.error('❌ Missing verification id in payload');
    return { success: false, message: 'Invalid payload structure', body };
  }

  await this.kycService.handleWebhook(verification);
  return { success: true };
}




  @Get('status/:userId')
  @ApiOperation({ summary: 'Get KYC status' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'KYC status fetched successfully' })
  async getStatus(@Param('userId') userId: string) {
    return this.kycService.getKycStatus(userId);
  }

  @Post('sync/:userId')
  @ApiOperation({ summary: 'Sync KYC status with Veriff API' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'KYC status synced successfully' })
  async syncStatus(@Param('userId') userId: string) {
    return this.kycService.syncKycStatus(userId);
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Sync all pending/submitted KYC records with Veriff API' })
  @ApiResponse({ status: 200, description: 'All pending KYC records synced successfully' })
  async syncAllPending() {
    return this.kycService.syncAllPendingKyc();
  }

  @Get('callback')
  async veriffCallback(@Query('userId') userId: string, @Res() res: Response) {
    let status = 'PENDING';

    if (userId) {
      try {
        const synced = await this.kycService.syncKycStatus(userId);
        status = (synced as any)?.status || status;
      } catch {
        const latest = await this.kycService.getKycStatus(userId);
        status = (latest as any)?.status || status;
      }
    }

    const normalized = (status || 'PENDING').toUpperCase();
    if (normalized === 'APPROVED' || normalized === 'SUBMITTED') {
      return res.redirect('/veriff.html');
    }

    return res.redirect('/veriff-incomplete.html');
  }
}