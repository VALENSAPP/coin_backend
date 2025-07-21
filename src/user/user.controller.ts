import { Body, Controller, Post, Patch, Get, Param, Delete, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsEmail, IsInt } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';

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
  phoneNumber?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
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
    const user = await this.userService.register(dto);
    return { message: 'User registered', user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.userService.validateUser(dto);
    return { message: 'User validated', user };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Edit user profile' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async editProfile(
    @Req() req: Request,
    @Body() dto: ProfileEditDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    // req.user may not be typed, so use 'as any' for id access
    const userId = (req.user as any)?.id || req.body.userId; // fallback for testing
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

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.getUserById(id);
    return { user };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (excluding soft-deleted)' })
  async getAllUsers() {
    const users = await this.userService.getAllUsers();
    return { users };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user by ID' })
  @ApiParam({ name: 'id', type: String })
  async softDeleteUser(@Param('id') id: string) {
    await this.userService.softDeleteUser(id);
    return { message: 'User soft deleted' };
  }
} 