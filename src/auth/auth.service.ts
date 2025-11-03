import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService, RegistrationType } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import admin from './firebase.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(loginDto: any) {
    // Use userService to validate user
    return this.userService.validateUser(loginDto);
  }

  async login(loginDto: any) {
    // Check if this is a Firebase Google sign-in request
    // if (loginDto.idToken && loginDto.registrationType === 'GOOGLE') {
    if (loginDto.googleId) {
      return this.signInWithGoogle(loginDto.googleId);
    }

     if (loginDto.appleId) {
      return this.signInWithApple(loginDto.appleId);
    }

    // Check if this is a Firebase Twitter sign-in request
    // if (loginDto.twitterId) {
    //   return this.signInWithTwitter(loginDto.twitterId);
    // }

    const user = await this.validateUser(loginDto);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, email: user.email, registrationType: user.registrationType };
    const access_token = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExpiresAt,
      },
    });

    return {
      access_token,
      refresh_token: refreshToken,
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

  async refreshToken(refreshToken: string) {
    // Find user with valid refresh token
    const user = await this.prisma.user.findFirst({
      where: {
        refreshToken,
        refreshTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new access token
    const payload = { sub: user.id, email: user.email, registrationType: user.registrationType };
    const access_token = this.jwtService.sign(payload);

    // Optionally generate new refresh token (token rotation)
    const newRefreshToken = randomBytes(32).toString('hex');
    const newRefreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      },
    });

    return {
      access_token,
      refresh_token: newRefreshToken,
    };
  }

  async signInWithGoogle(idToken: string) {
      try {
        // Validate idToken input
        if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
          return {
            error: true,
            msg: 'Invalid ID token provided',
            body: [],
          };
        }
  
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;
        const provider = decodedToken.firebase?.sign_in_provider;
  
        // Determine login type based on email domain
        let loginType: RegistrationType = 'GOOGLE';
        if (email && email.endsWith('.ac.jp')) {
          loginType = 'NORMAL'; // '1' is student, but using NORMAL for now
        }
  
        // Check if user exists
        const existingUser = await this.prisma.user.findFirst({
          where: { email },
        });
  
        if (existingUser) {
          // User exists, check if deleted
          if (existingUser.isDeleted === 1) {
            throw new BadRequestException('Account is deleted by admin');
          }
  
          // Check email verification for password provider
          if (provider === 'password' && existingUser.verifyEmail !== 1) {
            throw new BadRequestException('Please verify your email before signing in.');
          }
  
          // Generate tokens
         const payload = { sub: existingUser.id, email: existingUser.email, registrationType: existingUser.registrationType };
   const access_token = this.jwtService.sign(payload);
  
          // Store refresh token
          const refreshTokenHash = randomBytes(32).toString('hex');
          const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
  
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              refreshToken: refreshTokenHash,
              refreshTokenExpiresAt,
            },
          });
  
          return {
            access_token: access_token,
            refresh_token: refreshTokenHash,
            ...existingUser
          };
        } else {
          // New user registration
          const firebaseUserId = decodedToken.uid;
          const userId = uuidv4();
  
          const userData = {
            id: userId,
            firebaseUserId,
            email,
            userName: decodedToken.name || 'Unknown User',
            profile: decodedToken.picture || null,
            googleId: provider === 'google.com' ? firebaseUserId : null,
            registrationType: loginType,
            verifyEmail: 1, // Firebase users are verified
          };
  
          // Create user
          const newUser = await this.prisma.user.create({
            data: userData,
          });
  
          // Generate tokens
          const payload = { sub: newUser.id, email: newUser.email, registrationType: newUser.registrationType };
    const access_token = this.jwtService.sign(payload);
  
          // Store refresh token
          const refreshTokenHash = randomBytes(32).toString('hex');
          const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
  
          await this.prisma.user.update({
            where: { id: newUser.id },
            data: {
              refreshToken: refreshTokenHash,
              refreshTokenExpiresAt,
            },
          });
  
          return {
            access_token: access_token,
            refresh_token: refreshTokenHash,
            ...newUser
          };
        }
      } catch (error) {
        console.error('Firebase auth error:', error);
        return {
          error: true,
          msg: error.message || 'Token verification failed',
          body: [error],
        };
      }
    }

    async signInWithApple(idToken: string) {
      try {
        // Validate idToken input
        if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
          return {
            error: true,
            msg: 'Invalid ID token provided',
            body: [],
          };
        }
  
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;
        const provider = decodedToken.firebase?.sign_in_provider;
  
        // Determine login type based on email domain
        let loginType: RegistrationType = 'GOOGLE';
        if (email && email.endsWith('.ac.jp')) {
          loginType = 'NORMAL'; // '1' is student, but using NORMAL for now
        }
  
        // Check if user exists
        const existingUser = await this.prisma.user.findFirst({
          where: { email },
        });
  
        if (existingUser) {
          // User exists, check if deleted
          if (existingUser.isDeleted === 1) {
            throw new BadRequestException('Account is deleted by admin');
          }
  
          // Check email verification for password provider
          if (provider === 'password' && existingUser.verifyEmail !== 1) {
            throw new BadRequestException('Please verify your email before signing in.');
          }
  
          // Generate tokens
         const payload = { sub: existingUser.id, email: existingUser.email, registrationType: existingUser.registrationType };
   const access_token = this.jwtService.sign(payload);
  
          // Store refresh token
          const refreshTokenHash = randomBytes(32).toString('hex');
          const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
  
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              refreshToken: refreshTokenHash,
              refreshTokenExpiresAt,
            },
          });
  
          return {
            access_token: access_token,
            refresh_token: refreshTokenHash,
            ...existingUser
          };
        } else {
          // New user registration
          const firebaseUserId = decodedToken.uid;
          const userId = uuidv4();
  
          const userData = {
            id: userId,
            firebaseUserId,
            email,
            userName: decodedToken.name || 'Unknown User',
            profile: decodedToken.picture || null,
            googleId: provider === 'google.com' ? firebaseUserId : null,
            registrationType: loginType,
            verifyEmail: 1, // Firebase users are verified
          };
  
          // Create user
          const newUser = await this.prisma.user.create({
            data: userData,
          });
  
          // Generate tokens
          const payload = { sub: newUser.id, email: newUser.email, registrationType: newUser.registrationType };
    const access_token = this.jwtService.sign(payload);
  
          // Store refresh token
          const refreshTokenHash = randomBytes(32).toString('hex');
          const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
  
          await this.prisma.user.update({
            where: { id: newUser.id },
            data: {
              refreshToken: refreshTokenHash,
              refreshTokenExpiresAt,
            },
          });
  
          return {
            access_token: access_token,
            refresh_token: refreshTokenHash,
            ...newUser
          };
        }
      } catch (error) {
        console.error('Firebase auth error:', error);
        return {
          error: true,
          msg: error.message || 'Token verification failed',
          body: [error],
        };
      }
    }
//  async signInWithTwitter(idToken: string) {
//    try {
//      // Validate idToken input
//      if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
//        return {
//          error: true,
//          msg: 'Invalid ID token provided',
//          body: [],
//        };
//      }

//      // Verify Firebase ID token
//      const decodedToken = await admin.auth().verifyIdToken(idToken);
//      const email = decodedToken.email;
//      const provider = decodedToken.firebase?.sign_in_provider;

//      // Determine login type based on email domain
//      let loginType: RegistrationType = 'TWITTER';
//      if (email && email.endsWith('.ac.jp')) {
//        loginType = 'NORMAL'; // '1' is student, but using NORMAL for now
//      }

//      // Check if user exists
//      const existingUser = await this.prisma.user.findFirst({
//        where: { email },
//      });

//      if (existingUser) {
//        // User exists, check if deleted
//        if (existingUser.isDeleted === 1) {
//          throw new BadRequestException('Account is deleted by admin');
//        }

//        // Check email verification for password provider
//        if (provider === 'password' && existingUser.verifyEmail !== 1) {
//          throw new BadRequestException('Please verify your email before signing in.');
//        }

//        // Generate tokens
//        const token = this.jwtService.sign({
//          userId: existingUser.id,
//          email: existingUser.email,
//          user_name: existingUser.userName,
//        }, { expiresIn: '1d' });

//        const refreshToken = this.jwtService.sign({
//          userId: existingUser.id,
//          email: existingUser.email,
//          user_name: existingUser.userName,
//        }, { expiresIn: '5d' });

//        // Store refresh token
//        const refreshTokenHash = randomBytes(32).toString('hex');
//        const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days

//        await this.prisma.user.update({
//          where: { id: existingUser.id },
//          data: {
//            refreshToken: refreshTokenHash,
//            refreshTokenExpiresAt,
//          },
//        });

//        return {
//          access_token: token,
//          refresh_token: refreshTokenHash,
//          ...existingUser
//        };
//      } else {
//        // New user registration
//        const firebaseUserId = decodedToken.uid;
//        const userId = uuidv4();

//        const userData = {
//          id: userId,
//          firebaseUserId,
//          email,
//          userName: decodedToken.name || 'Unknown User',
//          profile: decodedToken.picture || null,
//          twitterId: provider === 'twitter.com' ? firebaseUserId : null,
//          registrationType: loginType,
//          verifyEmail: 1, // Firebase users are verified
//        };

//        // Create user
//        const newUser = await this.prisma.user.create({
//          data: userData,
//        });

//        // Generate tokens
//        const token = this.jwtService.sign({
//          userId: newUser.id,
//          email: newUser.email,
//          user_name: newUser.userName,
//        }, { expiresIn: '1d' });

//        const refreshToken = this.jwtService.sign({
//          userId: newUser.id,
//          email: newUser.email,
//          user_name: newUser.userName,
//        }, { expiresIn: '5d' });

//        // Store refresh token
//        const refreshTokenHash = randomBytes(32).toString('hex');
//        const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days

//        await this.prisma.user.update({
//          where: { id: newUser.id },
//          data: {
//            refreshToken: refreshTokenHash,
//            refreshTokenExpiresAt,
//          },
//        });

//        return {
//          access_token: token,
//          refresh_token: refreshTokenHash,
//          ...newUser
//        };
//      }
//    } catch (error) {
//      console.error('Firebase auth error:', error);
//      return {
//        error: true,
//        msg: error.message || 'Token verification failed',
//        body: [error],
//      };
//    }
//  }
}