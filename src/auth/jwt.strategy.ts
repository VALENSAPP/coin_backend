import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'valens_secret',
    });
  }

  async validate(payload: any) {
    console.log('JWT payload:', payload);
    return { userId: payload.sub, email: payload.email, registrationType: payload.registrationType };
  }
} 