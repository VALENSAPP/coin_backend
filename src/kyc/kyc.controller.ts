import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { KycService } from './kyc.service';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { VeriffWebhookDto } from './dto/webhook.dto';

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

  @Post('webhook')
  @ApiOperation({ summary: 'Veriff Webhook' })
  @ApiBody({ type: VeriffWebhookDto })
  @ApiResponse({ status: 200, description: 'Webhook handled successfully' })
  async webhook(@Body() body: VeriffWebhookDto) {
      console.log('🔔 Veriff Webhook Received:', JSON.stringify(body, null, 2));
    return this.kycService.handleWebhook(body);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Get KYC status' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'KYC status fetched successfully' })
  async getStatus(@Param('userId') userId: string) {
    return this.kycService.getKycStatus(userId);
  }
}
