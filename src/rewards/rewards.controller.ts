import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RewardsService } from './rewards.service';
import {
  CalculateQuoteDto,
  GetCatalogQueryDto,
  LinkLoyaltyAccountDto,
  RedeemPointsDto,
  RedemptionHistoryQueryDto,
  RewardProviderEnum,
} from './dto/rewards.dto';

@ApiTags('rewards')
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'Get available reward redemption categories & partner programs',
    description:
      'Fetches the available redemption catalog across Airline Miles (Points.com), Hotel Points (Points.com), Direct Travel Bookings (Expedia), and Gift Cards / Experiences (Merit).',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reward catalog retrieved' })
  async getCatalog(@Query() query: GetCatalogQueryDto) {
    return this.rewardsService.getCatalog(query);
  }

  @Post('quote')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate dynamic exchange quote for Valens points',
    description:
      'Queries partner rate adapters to calculate how many miles, hotel points, or USD booking credit the specified Valens Points will yield.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quote calculated successfully' })
  async calculateQuote(@Body() dto: CalculateQuoteDto) {
    return this.rewardsService.calculateQuote(dto);
  }

  @Get('linked-accounts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List authenticated user’s linked loyalty accounts',
    description:
      'Retrieves frequent flyer & hotel loyalty accounts connected to the user’s Valens profile.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Linked accounts retrieved' })
  async getLinkedAccounts(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.rewardsService.getLinkedAccounts(userId);
  }

  @Post('linked-accounts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Link a partner loyalty account (Airlines, Hotels, etc.)',
    description:
      'Validates account formatting with partner adapter and connects the loyalty number to the user profile.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Loyalty account linked' })
  async linkLoyaltyAccount(
    @Req() req: Request,
    @Body() dto: LinkLoyaltyAccountDto,
  ) {
    const userId = (req.user as any).userId;
    return this.rewardsService.linkLoyaltyAccount(userId, dto);
  }

  @Delete('linked-accounts/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink a partner loyalty account' })
  @ApiParam({ name: 'id', description: 'Loyalty account ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Loyalty account unlinked' })
  async unlinkLoyaltyAccount(
    @Req() req: Request,
    @Param('id') accountId: string,
  ) {
    const userId = (req.user as any).userId;
    return this.rewardsService.unlinkLoyaltyAccount(userId, accountId);
  }

  @Post('redeem')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Redeem Valens Points for external rewards',
    description:
      'Transactionally reserves Valens Points, executes fulfillment via the selected partner provider (Merit, Points.com, or Expedia), and records transaction audit history.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Redemption initiated or completed' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Insufficient points or partner error' })
  async redeemPoints(@Req() req: Request, @Body() dto: RedeemPointsDto) {
    const userId = (req.user as any).userId;
    return this.rewardsService.redeemPoints(userId, dto);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get redemption transaction history',
    description: 'Returns paginated list of past point redemptions and their status.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Redemption history retrieved' })
  async getRedemptionHistory(
    @Req() req: Request,
    @Query() query: RedemptionHistoryQueryDto,
  ) {
    const userId = (req.user as any).userId;
    return this.rewardsService.getRedemptionHistory(userId, query);
  }

  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Provider webhook endpoint for async fulfillment updates',
    description:
      'Receives callback events from Merit Incentives, Points.com, or Expedia Group regarding transfer/order status changes.',
  })
  async handleWebhook(
    @Param('provider') provider: RewardProviderEnum,
    @Body() payload: any,
  ) {
    return this.rewardsService.handleProviderWebhook(provider, payload);
  }
}
