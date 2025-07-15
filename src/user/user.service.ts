import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export type RegistrationType = 'NORMAL' | 'GOOGLE' | 'TWITTER' | 'WALLET';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: {
    email?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
  }) {
    // Check for existing user by unique fields
    if (data.email && await this.prisma.user.findUnique({ where: { email: data.email } })) {
      throw new BadRequestException('Email already registered');
    }
    if (data.googleId && await this.prisma.user.findUnique({ where: { googleId: data.googleId } })) {
      throw new BadRequestException('Google account already registered');
    }
    if (data.twitterId && await this.prisma.user.findUnique({ where: { twitterId: data.twitterId } })) {
      throw new BadRequestException('Twitter account already registered');
    }
    if (data.walletAddress && await this.prisma.user.findUnique({ where: { walletAddress: data.walletAddress } })) {
      throw new BadRequestException('Wallet address already registered');
    }
    let passwordHash = undefined;
    if (data.registrationType === 'NORMAL') {
      if (!data.email || !data.password) throw new BadRequestException('Email and password required');
      passwordHash = await bcrypt.hash(data.password, 10);
    }
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        googleId: data.googleId,
        twitterId: data.twitterId,
        walletAddress: data.walletAddress,
        registrationType: data.registrationType,
      },
    });
    return user;
  }

  async validateUser(data: {
    email?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
  }) {
    let user = null;
    if (data.registrationType === 'NORMAL') {
      if (!data.email || !data.password) throw new BadRequestException('Email and password required');
      user = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (!user || !user.password || !(await bcrypt.compare(data.password, user.password))) {
        throw new BadRequestException('Invalid credentials');
      }
    } else if (data.registrationType === 'GOOGLE' && data.googleId) {
      user = await this.prisma.user.findUnique({ where: { googleId: data.googleId } });
      if (!user) throw new BadRequestException('Google account not registered');
    } else if (data.registrationType === 'TWITTER' && data.twitterId) {
      user = await this.prisma.user.findUnique({ where: { twitterId: data.twitterId } });
      if (!user) throw new BadRequestException('Twitter account not registered');
    } else if (data.registrationType === 'WALLET' && data.walletAddress) {
      user = await this.prisma.user.findUnique({ where: { walletAddress: data.walletAddress } });
      if (!user) throw new BadRequestException('Wallet address not registered');
    } else {
      throw new BadRequestException('Invalid login type or missing credentials');
    }
    return user;
  }
} 