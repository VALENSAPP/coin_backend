import { Body, Controller, Post, Patch, Get, Param, Delete, UseInterceptors, UploadedFile, Req, UseGuards, Query, ParseUUIDPipe,BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsEmail, IsInt, IsUUID } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FollowPersonDto, UnfollowDto, BlockUserDto, UnblockUserDto } from './dto/follow.dto';
import { RecentActivitiesDto } from './dto/recent-activities.dto';
import { CreateUserSubscriptionDto, UpdateUserSubscriptionDto, UserSubscriptionStatus } from './dto/user-subscription.dto';

export enum RegistrationType {
  NORMAL = 'NORMAL',
  GOOGLE = 'GOOGLE',
  TWITTER = 'TWITTER',
  WALLET = 'WALLET',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class RegisterDto {
   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   email?: string;

   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   userName?: string;

   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   profile?: string;

   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   password?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  appleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiProperty({ enum: RegistrationType, required: true })
  @IsEnum(RegistrationType)
  @IsNotEmpty()
  registrationType: RegistrationType;
}

export class LoginDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiProperty({ enum: RegistrationType, required: true })
  @IsEnum(RegistrationType)
  @IsNotEmpty()
  registrationType: RegistrationType;
}

export class ProfileEditDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ 
    enum: Gender, 
    required: false,
    description: 'Must be MALE, FEMALE, or OTHER'
  })
  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be MALE, FEMALE, or OTHER' })
  gender?: Gender;

  @ApiProperty({ required: false, type: 'string', format: 'binary' })
  @IsOptional()
  image?: any; // File upload

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  age?: number;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  otp: string;
}

export class SendEmailOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class VerifyEmailOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class CheckDisplayNameDto {
  @ApiProperty({
    description: 'Display name to check for availability',
    example: 'john_doe'
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class GetProfileDto {
  @ApiProperty({ 
    description: 'User ID to get profile for', 
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

export class GetUserDashboardDto {
  @ApiProperty({
    description: 'User ID to get dashboard data for',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}


export class GetAllUsersDto {
  @ApiProperty({
    description: 'Search by email',
    required: false,
    example: 'user@example.com'
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Search by userName',
    required: false,
    example: 'john_doe'
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({
    description: 'Search by googleId',
    required: false,
    example: '123456789'
  })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({
    description: 'Search by twitterId',
    required: false,
    example: '123456789'
  })
  @IsOptional()
  @IsString()
  twitterId?: string;

  @ApiProperty({
    description: 'Search by phoneNumber',
    required: false,
    example: '+1234567890'
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class ProfileStatusSetDto {
  @ApiProperty({
    description: 'Profile status to set',
    required: true,
    example: 'public'
  })
  @IsString()
  @IsNotEmpty()
  profileStatus: string;
}

export class ReactivateAccountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  appleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiProperty({ enum: RegistrationType, required: true })
  @IsEnum(RegistrationType)
  @IsNotEmpty()
  registrationType: RegistrationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.userService.register(dto);

    // Handle Firebase Google registration response format
    if ('error' in result) {
      return result;
    }

    // Handle normal registration response format
    return result;
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile by userId' })
  @ApiQuery({ name: 'userId', type: 'string', description: 'User ID to get profile for' })
  async getProfile(@Req() req: Request, @Query() query: GetProfileDto) {
    const viewerId = (req.user as any).userId;
    const user = await this.userService.getUserById(query.userId);
    const isFollow = await this.userService.isFollowing(viewerId, query.userId);
    return { ...user, isFollow };
  }

  @Patch('editProfile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Edit user profile',
    description: 'Update user profile fields. All fields are optional. If wallet address already exists, it cannot be updated (contact admin).'
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async editProfile(
    @Req() req: Request,
    @Body() dto: ProfileEditDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    const userId = (req.user as any).userId;
    console.log("LLLLLLLLLLLLLLLLLLLL",req.user,userId);
    
    const user = await this.userService.editProfile(userId, dto, image);
    return { message: 'Profile updated', user };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send OTP to email for password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.userService.forgotPassword(dto.email);
    return { message: 'OTP sent to email' };
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.userService.verifyOtp(dto.email, dto.otp);
    return { message: 'OTP verified' };
  }

  @Post('send-email-otp')
  @ApiOperation({ summary: 'Send OTP to email for email verification' })
  async sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    await this.userService.sendEmailOtp(dto.email);
    return { message: 'OTP sent to email' };
  }

  @Post('verify-email-otp')
  @ApiOperation({ summary: 'Verify OTP for email verification' })
  async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    await this.userService.verifyEmailOtp(dto.email, dto.otp);
    return { message: 'Email verified' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password after OTP verification' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.userService.resetPassword(dto.email, dto.newPassword);
    return { message: 'Password reset successful' };
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req.user as any).userId;
    await this.userService.changePassword(userId, dto.oldPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Post('follow')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiBody({ type: FollowPersonDto })
  @ApiOperation({ 
    summary: 'Follow a user',
    description: 'Follow a user directly (followerId is automatically extracted from JWT token)'
  })
  async followPerson(@Req() req: Request, @Body() dto: FollowPersonDto) {
    const followerId = (req.user as any).userId; // Use 'userId' instead of 'id'
    return this.userService.followPerson(followerId, dto.followingId);
  }

  @Post('unfollow')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiBody({ type: UnfollowDto })
  @ApiOperation({ 
    summary: 'Unfollow a user',
    description: 'Unfollow a user (followerId is automatically extracted from JWT token)'
  })
  async unfollow(@Req() req: Request, @Body() dto: UnfollowDto) {
    const followerId = (req.user as any).userId; // Use 'userId' instead of 'id'
    return this.userService.unfollow(followerId, dto.followingId);
  }

  @Post('block-user')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiBody({ type: BlockUserDto })
  @ApiOperation({ 
    summary: 'Block a user',
    description: 'Block a user (blockerId is automatically extracted from JWT token)'
  })
  async blockUser(@Req() req: Request, @Body() dto: BlockUserDto) {
    const blockerId = (req.user as any).userId; // Use 'userId' instead of 'id'
    return this.userService.blockUser(blockerId, dto.blockedId);
  }

  @Post('unblock-user')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiBody({ type: UnblockUserDto })
  @ApiOperation({ 
    summary: 'Unblock a user',
    description: 'Unblock a user (blockerId is automatically extracted from JWT token)'
  })
  async unblockUser(@Req() req: Request, @Body() dto: UnblockUserDto) {
    const blockerId = (req.user as any).userId; // Use 'userId' instead of 'id'
    return this.userService.unblockUser(blockerId, dto.blockedId);
  }

  @Get('pending-requests')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get pending follow requests',
    description: 'Returns empty array since follow requests are now direct (userId is automatically extracted from JWT token)'
  })
  async getPendingFollowRequests(@Req() req: Request) {
    const userId = (req.user as any).userId; // Use 'userId' instead of 'id'
    return this.userService.getPendingFollowRequests(userId);
  }

  @Get('followers/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getFollowersList(@Param('userId') userId: string) {
    return this.userService.getFollowersList(userId);
  }

  @Get('following/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getFollowingList(@Param('userId') userId: string) {
    return this.userService.getFollowingList(userId);
  }

  @Get('blocked-users')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get blocked users for the authenticated user',
    description: 'Returns list of users blocked by the authenticated user (blockerId is automatically extracted from JWT token)'
  })
  async getBlockedUsers(@Req() req: Request) {
    const blockerId = (req.user as any).userId; // Use 'userId' instead of 'id'
    return this.userService.getBlockedUsers(blockerId);
  }

  @Get('all')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (excluding soft-deleted) with optional search filters' })
  @ApiQuery({ name: 'email', type: String, required: false, description: 'Search by email' })
  @ApiQuery({ name: 'userName', type: String, required: false, description: 'Search by userName' })
  @ApiQuery({ name: 'googleId', type: String, required: false, description: 'Search by googleId' })
  @ApiQuery({ name: 'twitterId', type: String, required: false, description: 'Search by twitterId' })
  @ApiQuery({ name: 'phoneNumber', type: String, required: false, description: 'Search by phoneNumber' })
  async getAllUsers(@Query() query: GetAllUsersDto) {
    const users = await this.userService.getAllUsers(query);
    return { users };
  }

  @Get('display-names')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all display names of all users',
    description: 'Retrieves display names, user names, emails, and IDs of all users (excluding soft-deleted users)'
  })
  async getDisplayNames() {
    const users = await this.userService.getDisplayNames();
    return { users };
  }

  @Post('check-display-name')
  @ApiOperation({ 
    summary: 'Check display name availability',
    description: 'Check if a display name is available. If taken, returns 4 similar suggestions.'
  })
  @ApiBody({ type: CheckDisplayNameDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Display name check result',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['approved', 'taken'] },
        message: { type: 'string' },
        displayName: { type: 'string' },
        suggestions: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of 4 suggested display names (only if status is "taken")'
        }
      }
    }
  })
  async checkDisplayName(@Body() dto: CheckDisplayNameDto) {
    const result = await this.userService.checkDisplayNameAvailability(dto.displayName);
    return result;
  }

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user dashboard data' })
  @ApiQuery({ name: 'userId', type: 'string', description: 'User ID to get dashboard data for' })
  @ApiResponse({ 
    status: 200, 
    description: 'User dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dashboardData: {
          type: 'object',
          properties: {
            totalPosts: { type: 'number', description: 'Total number of posts by the user' },
            totalFollowing: { type: 'number', description: 'Total number of users the user is following' },
            totalFollowers: { type: 'number', description: 'Total number of users following the user' }
          }
        }
      }
    }
  })
  async getUserDashboard(@Query() query: GetUserDashboardDto) {
    const dashboardData = await this.userService.getUserDashboard(query.userId);
    return { dashboardData };
  }

  // Place static route before dynamic ":id" to avoid conflicts
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('search')
  @ApiOperation({ summary: 'Search users by display name, user name, or email' })
  @ApiQuery({ name: 'query', type: String, description: 'Search term', required: true })
  async searchUser(@Query('query') query: string) {
    const users = await this.userService.searchUser(query);
    return { users };
  }

  @Get('recent-activities')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent activities for the authenticated user' })
  @ApiQuery({ name: 'type', type: String, required: false, description: 'Filter by activity type: purchase, sell, following' })
  async getRecentActivities(@Req() req: Request, @Query() query: RecentActivitiesDto) {
    const userId = (req.user as any).userId;
    const activities = await this.userService.recentActivities(userId, query.type);
    return { activities };
  }

  @Get('suggested-users')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get suggested users based on common followers and following' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Number of suggested users to return (default: 10)' })
  async getSuggestedUsers(@Req() req: Request, @Query('limit') limit?: string) {
    const userId = (req.user as any).userId;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const suggestedUsers = await this.userService.getSuggestedUsers(userId, limitNum);
    return { suggestedUsers };
  }

  // Place static route before dynamic ":id" to avoid conflicts
  @Get('getHitLeft')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user hit left and post count' })
  async getHitLeft(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const result = await this.userService.getHitLeft(userId);
    return result;
  }

  @Post('profileStatusSet')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set user profile status' })
  @ApiBody({ type: ProfileStatusSetDto })
  async setProfileStatus(@Req() req: Request, @Body() dto: ProfileStatusSetDto) {
    const userId = (req.user as any).userId;
    return this.userService.setProfileStatus(userId, dto.profileStatus);
  }

  @Post('accountDelete')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account (set isDeleted = 1)' })
  async accountDelete(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.userService.accountDelete(userId);
  }

  @Post('reactivateAccount')
  @ApiOperation({ summary: 'Reactivate deleted user account (set isDeleted = 0)' })
  @ApiBody({ type: ReactivateAccountDto })
  async reactivateAccount(@Body() dto: ReactivateAccountDto) {
    return this.userService.reactivateAccount(dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  async getUserById(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.userService.getUserById(id);
    return { user };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete user by ID' })
  @ApiParam({ name: 'id', type: String })
  async softDeleteUser(@Param('id') id: string) {
    await this.userService.softDeleteUser(id);
    return { message: 'User soft deleted' };
  }

  // UserSubscription CRUD Endpoints

  @Post('subscription')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user subscription' })
  @ApiBody({ type: CreateUserSubscriptionDto })
  @ApiResponse({ status: 201, description: 'User subscription created successfully' })
  async createUserSubscription(@Req() req: Request, @Body() dto: CreateUserSubscriptionDto) {
    const userId = (req.user as any).userId;
    const subscription = await this.userService.createUserSubscription(userId, dto);
    return { message: 'User subscription created successfully', subscription };
  }

  // ✅ STATIC ROUTE FIRST (no :id parameter)
  @Get('getSubscriptionByUserID/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user subscriptions' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User subscriptions retrieved successfully' })
  async getSubscriptionByUserID(@Param('userId') userId: string) {
    console.log('[getUserSubscriptions] userId:', userId);

    const subscriptions = await this.userService.getUserSubscriptions(userId);
    return { subscriptions };
  }

  // ✅ DYNAMIC ROUTE SECOND (with :id parameter)
  @Get('subscription/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user subscription by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User subscription ID' })
  @ApiResponse({ status: 200, description: 'User subscription retrieved successfully' })
  async getUserSubscriptionById(@Param('id') id: string) {
    const subscription = await this.userService.getUserSubscriptionById(id);
    return { subscription };
  }

  @Patch('subscription/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user subscription' })
  @ApiParam({ name: 'id', type: String, description: 'User subscription ID' })
  @ApiBody({ type: UpdateUserSubscriptionDto })
  @ApiResponse({ status: 200, description: 'User subscription updated successfully' })
  async updateUserSubscription(@Param('id') id: string, @Body() dto: UpdateUserSubscriptionDto) {
    const subscription = await this.userService.updateUserSubscription(id, dto);
    return { message: 'User subscription updated successfully', subscription };
  }

  @Delete('subscription/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete user subscription' })
  @ApiParam({ name: 'id', type: String, description: 'User subscription ID' })
  @ApiResponse({ status: 200, description: 'User subscription deleted successfully' })
  async deleteUserSubscription(@Param('id') id: string) {
    await this.userService.deleteUserSubscription(id);
    return { message: 'User subscription deleted successfully' };
  }

  @Post('enable-two-factor')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  async enableTwoFactor(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.userService.enableTwoFactor(userId);
  }

  @Post('verify-two-factor')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and enable two-factor authentication' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } } } })
  async verifyAndEnableTwoFactor(@Req() req: Request, @Body() dto: { token: string }) {
    const userId = (req.user as any).userId;
    return this.userService.verifyAndEnableTwoFactor(userId, dto.token);
  }

  @Post('disable-two-factor')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } } } })
  async disableTwoFactor(@Req() req: Request, @Body() dto: { token: string }) {
    const userId = (req.user as any).userId;
    return this.userService.disableTwoFactor(userId, dto.token);
  }

  @Post('update-fcm-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update FCM token for push notifications' })
  @ApiBody({ schema: { type: 'object', properties: { fcmToken: { type: 'string' } } } })
  async updateFcmToken(@Req() req: Request, @Body() dto: { fcmToken: string }) {
    const userId = (req.user as any).userId;
    return this.userService.updateFcmToken(userId, dto.fcmToken);
  }
}