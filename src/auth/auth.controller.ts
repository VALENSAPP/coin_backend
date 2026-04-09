import { Controller, Post, Body, UseGuards, Get, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiProperty, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { RegistrationType } from '../user/user.controller';

export class RefreshTokenDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class GetLoginHistoryDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class LogoutSessionDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class DeviceAccountsDto {
  @ApiProperty({ required: true, description: 'Device identifier from client' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

export class SwitchAccountDto {
  @ApiProperty({ required: true, description: 'Device identifier from client' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ required: true, description: 'Target user id to switch to' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class RemoveAccountDto {
  @ApiProperty({ required: true, description: 'Device identifier from client' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ required: true, description: 'User id to remove from this device' })
  @IsString()
  @IsNotEmpty()
  userId: string;
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
  twitterAccessToken?: string;

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

  @ApiProperty({ required: false, description: 'Device identifier from client (stable per device if possible)' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false, description: 'Friendly device name (e.g., iPhone 15, Pixel 8)' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({ required: false, description: 'Device type (e.g., ios, android, web)' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiProperty({ required: false, description: 'Client-reported location (e.g., city/country or lat,lng)' })
  @IsOptional()
  @IsString()
  location?: string;
}


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() body: LoginDto, @Request() req: any) {
    const result = await this.authService.login(body, req);
    if (result && typeof result === 'object' && (result as any).error === true) {
      throw new UnauthorizedException((result as any).msg || 'Login failed');
    }
    return {
      message: 'User logged in successfully',
      user: result
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refreshToken(@Body() body: RefreshTokenDto, @Request() req: any) {
    const result = await this.authService.refreshToken(body.refreshToken, req);
    return {
      message: 'Token refreshed successfully',
      ...result
    };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async getProfile(@Request() req: any) {
    const userId = req.user.userId; // JWT payload stores user id in 'userId' field
    return this.authService.getProfile(userId);
  }

  @Post('login-history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user login history' })
  async getLoginHistory(@Body() body: GetLoginHistoryDto) {
    return this.authService.getLoginHistory(body.userId);
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions for current user' })
  async listSessions(@Request() req: any) {
    const userId = req.user.userId;
    const currentSessionId = req.user.sessionId;
    return this.authService.listSessions(userId, currentSessionId);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logoutCurrent(@Request() req: any) {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.logoutCurrentSession(userId, sessionId);
  }

  @Post('logout-session')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout a specific session by sessionId' })
  async logoutSession(@Request() req: any, @Body() body: LogoutSessionDto) {
    const userId = req.user.userId;
    return this.authService.logoutSession(userId, body.sessionId);
  }

  @Post('logout-all')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions for current user' })
  async logoutAll(@Request() req: any) {
    const userId = req.user.userId;
    return this.authService.logoutAllSessions(userId);
  }

  @Post('device-accounts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List accounts saved on this device' })
  async listDeviceAccounts(@Request() req: any, @Body() body: DeviceAccountsDto) {
    const userId = req.user.userId;
    return this.authService.listDeviceAccounts(userId, body.deviceId);
  }

  @Post('switch')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch to another account using access token' })
  async switchAccount(@Request() req: any, @Body() body: SwitchAccountDto) {
    const currentUserId = req.user.userId;
    const result = await this.authService.switchAccount(currentUserId, body.deviceId, body.targetUserId, req);
    return {
      message: 'Switched account successfully',
      ...result,
    };
  }

  @Post('remove-account')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an account from this device' })
  async removeAccount(@Request() req: any, @Body() body: RemoveAccountDto) {
    const currentUserId = req.user.userId;
    return this.authService.removeDeviceAccount(currentUserId, body.deviceId, body.userId);
  }
}
