
import { Controller, Post, Body, Param, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { KycService } from './sumsubuser.service';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('sumsub-user_verification')
@Controller('sumsub-user_verification')
export class KycController {
  constructor(private readonly kycService: KycService) { }

  @Get('token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Sumsub SDK access token for current user KYC page' })
  @ApiResponse({ status: 200, description: 'Returns token for embedding Sumsub Web SDK' })
  async getToken(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    return this.kycService.getSumsubAccessToken(userId);
  }

  @Post('start/:userId')
  @ApiOperation({ summary: 'Start KYC verification' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documentType: { type: 'string', example: 'DRIVERS_LICENSE' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'KYC session created successfully (Sumsub)' })
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

    // console.log('📨 RAW VERIFF PAYLOAD:', JSON.stringify(body, null, 2));

    // handle both formats safely
    const verification = body.resource || body.verification || body;
    // console.log('✅ Extracted verification object:', JSON.stringify(verification, null, 2));

    const id = verification?.id;
    const action = verification?.action;
    const code = verification?.code;
    const applicantId = verification?.applicantId;
    const reviewAnswer = verification?.reviewResult?.reviewAnswer;
    // console.log(`🔍 Webhook data - ID: ${id}, Action: ${action}, Code: ${code}, applicantId: ${applicantId}, reviewAnswer: ${reviewAnswer}`);

    // Accept Veriff format (id) or Sumsub format (applicantId present)
    const isVeriff = !!id;
    const isSumsub = !!applicantId;
    if (!isVeriff && !isSumsub) {
      console.error('❌ Invalid payload: need id (Veriff) or applicantId (Sumsub)');
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
  @ApiOperation({ summary: 'Sync KYC status with Sumsub API' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'KYC status synced successfully' })
  async syncStatus(@Param('userId') userId: string) {
    return this.kycService.syncKycStatus(userId);
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Sync all pending/submitted KYC records with Sumsub API' })
  @ApiResponse({ status: 200, description: 'All pending KYC records synced successfully' })
  async syncAllPending() {
    return this.kycService.syncAllPendingKyc();
  }
}
