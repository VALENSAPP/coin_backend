import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiProperty, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { RegistrationType } from '../user/user.controller';

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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body);
    return {
      message: 'User logged in successfully',
      user: result
    };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async getProfile(@Request() req: any) {
    const userId = req.user.sub; // JWT payload stores user id in 'sub' claim
    return this.authService.getProfile(userId);
  }
} 