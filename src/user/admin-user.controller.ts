import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { UserService } from './user.service';
import {
  AdminBlockUserDto,
  AdminUnblockUserDto,
  GetBlockedUsersAdminDto,
} from './dto/admin-block-user.dto';

@ApiTags('Admin User Management')
@Controller(['admin/users', 'admin/user'])
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Post('block')
  @ApiOperation({
    summary: 'Block a user (Admin)',
    description:
      'Allows an administrator to block a user from accessing the platform. The user will be logged out from all devices, their tokens invalidated, and cannot log in until unblocked.',
  })
  @ApiBody({ type: AdminBlockUserDto })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or user already blocked' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin privileges required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async blockUser(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AdminBlockUserDto,
  ) {
    const adminUserId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.userService.adminBlockUser(adminUserId, dto);
  }

  @Post('unblock')
  @ApiOperation({
    summary: 'Unblock a user (Admin)',
    description:
      'Allows an administrator to unblock a previously blocked user, restoring their access to the platform.',
  })
  @ApiBody({ type: AdminUnblockUserDto })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or user is not blocked' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin privileges required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unblockUser(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AdminUnblockUserDto,
  ) {
    const adminUserId = (req.user as any)?.userId || (req.user as any)?.sub;
    return this.userService.adminUnblockUser(adminUserId, dto);
  }

  @Get('blocked')
  @ApiOperation({
    summary: 'Get all blocked users (Admin)',
    description:
      'Returns a paginated list of all users blocked by administrators, with optional search filtering by email, username, display name, or phone number.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Returns paginated blocked users list' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin privileges required' })
  async getBlockedUsers(
    @Query(new ValidationPipe({ whitelist: true, transform: true })) query: GetBlockedUsersAdminDto,
  ) {
    return this.userService.adminGetBlockedUsers(query);
  }

  @Get('block-status/:userId')
  @ApiOperation({
    summary: 'Get block status of a user (Admin)',
    description: 'Returns the current block status, reason, and timestamps for a specific user ID.',
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Returns user block status' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getBlockStatus(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userService.adminGetUserBlockStatus(userId);
  }
}
