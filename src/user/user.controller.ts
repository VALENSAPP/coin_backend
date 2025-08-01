import { Body, Controller, Post, Patch, Get, Param, Delete, UseInterceptors, UploadedFile, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsEmail, IsInt } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FollowPersonDto, UnfollowDto, BlockUserDto, UnblockUserDto } from './dto/follow.dto';

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
  otp: string;

  @ApiProperty()
  @IsString()
  newPassword: string;
}

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.userService.register(dto);
    return { 
      message: 'User registered',
      user: {
        access_token: result.access_token,
        ...result.user
      }
    };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: Request) {
    const userId = (req.user as any).userId; // Use 'userId' instead of 'id'
    const user = await this.userService.getUserById(userId);
    return { user };
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
    await this.userService.resetPassword(dto.email, dto.otp, dto.newPassword);
    return { message: 'Password reset successful' };
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
  @ApiOperation({ summary: 'Get all users (excluding soft-deleted)' })
  async getAllUsers() {
    const users = await this.userService.getAllUsers();
    return { users };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  async getUserById(@Param('id') id: string) {
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
} 