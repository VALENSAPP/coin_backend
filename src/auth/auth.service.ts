import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService, RegistrationType } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDto: any) {
    // Use userService to validate user
    return this.userService.validateUser(loginDto);
  }

  async login(loginDto: any) {
    const user = await this.validateUser(loginDto);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, email: user.email, registrationType: user.registrationType };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      ...user
    };
  }

  async getProfile(userId: string) {
    const user = await this.userService.getUserById(userId);
    return {
      message: 'Profile fetched successfully',
      user
    };
  }
} 