import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { TwitterStrategy } from './twitter.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'valens_secret',
      signOptions: { expiresIn: '1d' },
    }),
    UserModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtStrategy, GoogleStrategy, TwitterStrategy],
  exports: [JwtStrategy, JwtModule, PassportModule],
})
export class AuthModule {} 