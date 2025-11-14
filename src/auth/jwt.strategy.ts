import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { log } from 'node:console';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'valens_secret',
    });
  }
async validate(payload: any) {
  console.log('JWT payload:', payload);

  // Check if user exists and is not deleted
  const user = await this.prisma.user.findFirst({
    where: {
      id: payload.sub,
      isDeleted: 0,
    },
  });

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  console.log('Authenticated user:', { userId: payload.sub, email: payload.email });

  return { userId: payload.sub, email: payload.email, registrationType: payload.registrationType };
}
}