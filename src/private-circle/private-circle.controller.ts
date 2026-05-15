import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { PrivateCircleService } from './private-circle.service';
import { AddPrivateCircleMembersDto } from './dto/add-private-circle-members.dto';

@Controller('private-circle')
export class PrivateCircleController {
  constructor(private readonly privateCircleService: PrivateCircleService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('setup')
  @ApiOperation({ summary: 'Create or return the authenticated user private circle' })
  async setup(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.privateCircleService.setup(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('dashboard')
  @ApiOperation({ summary: 'Get private circle dashboard, limits, slots, and members' })
  async dashboard(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.privateCircleService.getDashboard(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('members')
  @ApiOperation({ summary: 'Add multiple users to the authenticated user private circle' })
  @ApiBody({ type: AddPrivateCircleMembersDto })
  async addMembers(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AddPrivateCircleMembersDto,
  ) {
    const userId = (req.user as any).userId;
    return this.privateCircleService.addMembers(userId, dto.userIds);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('members/:userId')
  @ApiOperation({ summary: 'Remove a user from the authenticated user private circle' })
  @ApiParam({ name: 'userId', type: 'string', description: 'Member user ID to remove' })
  async removeMember(@Req() req: Request, @Param('userId') memberUserId: string) {
    const userId = (req.user as any).userId;
    return this.privateCircleService.removeMember(userId, memberUserId);
  }
}
