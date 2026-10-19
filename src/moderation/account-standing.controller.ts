import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AccountStandingService } from './account-standing.service';

@ApiTags('Trust & Safety - Account Standing & Safety Controls')
@Controller('v1/users')
export class AccountStandingController {
  constructor(private readonly accountStandingService: AccountStandingService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get(':userId/account-standing')
  @ApiOperation({
    summary: 'Get account standing and active safety restrictions for a user',
    description:
      'Returns normalized standing (GOOD | WARNING | RESTRICTED | SUSPENDED | BANNED) and active restriction scopes.',
  })
  @ApiParam({ name: 'userId', description: 'User ID to check standing for' })
  async getAccountStanding(@Param('userId') userId: string) {
    return this.accountStandingService.getAccountStanding(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post(':userId/block')
  @ApiOperation({
    summary: 'Block a user (RESTful)',
    description: 'Stops direct messages, battle challenges, and suppresses interactions.',
  })
  @ApiParam({ name: 'userId', description: 'User ID to block' })
  async blockUser(@Req() req: Request, @Param('userId') userId: string) {
    const blockerId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.accountStandingService.blockUser(blockerId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete(':userId/block')
  @ApiOperation({
    summary: 'Unblock a user (RESTful)',
    description: 'Removes block restrictions on the target user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID to unblock' })
  async unblockUser(@Req() req: Request, @Param('userId') userId: string) {
    const blockerId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.accountStandingService.unblockUser(blockerId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post(':userId/mute')
  @ApiOperation({
    summary: 'Mute a user',
    description: 'Hides content and comments from target user without notifying them.',
  })
  @ApiParam({ name: 'userId', description: 'User ID to mute' })
  async muteUser(@Req() req: Request, @Param('userId') userId: string) {
    const muterId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.accountStandingService.muteUser(muterId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete(':userId/mute')
  @ApiOperation({
    summary: 'Unmute a user',
    description: 'Restores visibility of content from target user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID to unmute' })
  async unmuteUser(@Req() req: Request, @Param('userId') userId: string) {
    const muterId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.accountStandingService.unmuteUser(muterId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('me/safety-settings')
  @ApiOperation({
    summary: 'Get safety settings for current authenticated user',
    description: 'Returns lists of blocked and muted users.',
  })
  async getSafetySettings(@Req() req: Request) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.accountStandingService.getUserSafetySettings(userId);
  }
}
