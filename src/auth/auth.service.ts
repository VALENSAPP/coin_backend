import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService, RegistrationType } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import admin from './firebase.config';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly locationNameCache = new Map<string, string>();

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getIpAddress(req: any): string | undefined {
    const forwarded = req?.headers?.['x-forwarded-for'];
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0];
    }
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req?.ip || req?.socket?.remoteAddress;
  }

  private buildSessionMeta(req: any, loginDto?: any) {
    return {
      userAgent: req?.headers?.['user-agent']?.toString(),
      ipAddress: this.getIpAddress(req),
      deviceId: loginDto?.deviceId,
      deviceName: loginDto?.deviceName,
      deviceType: loginDto?.deviceType,
      location: loginDto?.location,
    };
  }

  private parseLatLng(location?: string): { lat: number; lng: number } | null {
    if (!location) return null;
    const parts = location.split(',').map((p) => p.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'jsonv2',
          lat,
          lon: lng,
          zoom: 16,
          addressdetails: 0,
        },
        headers: {
          'User-Agent': process.env.NOMINATIM_USER_AGENT || 'new_valens/1.0',
        },
        timeout: 4000,
      });

      const name = response?.data?.display_name;
      return typeof name === 'string' && name.trim() ? name.trim() : null;
    } catch {
      return null;
    }
  }

  private async getLocationName(location?: string): Promise<string | null> {
    if (!location) return null;
    const cached = this.locationNameCache.get(location);
    if (cached) return cached;

    const coords = this.parseLatLng(location);
    if (!coords) {
      this.locationNameCache.set(location, location);
      return location;
    }

    const name = await this.reverseGeocode(coords.lat, coords.lng);
    if (name) {
      this.locationNameCache.set(location, name);
      return name;
    }
    return null;
  }

  private async createSession(userId: string, refreshToken: string, refreshTokenExpiresAt: Date, meta?: any) {
    return this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        refreshTokenExpiresAt,
        lastActiveAt: new Date(),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        location: meta?.location,
        deviceId: meta?.deviceId,
        deviceName: meta?.deviceName,
        deviceType: meta?.deviceType,
      },
    });
  }

  private async upsertDeviceAccount(userId: string, deviceId?: string) {
    if (!deviceId) return;

    const existing = await this.prisma.deviceAccount.findFirst({
      where: { userId, deviceId },
    });

    if (existing) {
      await this.prisma.deviceAccount.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), removedAt: null },
      });
      return;
    }

    const activeCount = await this.prisma.deviceAccount.count({
      where: { deviceId, removedAt: null },
    });

    await this.prisma.deviceAccount.create({
      data: {
        userId,
        deviceId,
        isPrimary: activeCount === 0,
        lastLoginAt: new Date(),
      },
    });
  }

  private async issueTokensForUser(user: any, meta?: any) {
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.createSession(user.id, refreshToken, refreshTokenExpiresAt, meta);

    const payload = {
      sub: user.id,
      email: user.email,
      registrationType: user.registrationType,
      sessionId: session.id,
    };
    const access_token = this.jwtService.sign(payload);

    // Keep legacy fields for backward compatibility
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
      session_id: session.id,
    };
  }

  async validateUser(loginDto: any) {
    // Use userService to validate user
    return this.userService.validateUser(loginDto);
  }

  async login(loginDto: any, req?: any) {
    // Check if this is a Firebase Google sign-in request
    // if (loginDto.idToken && loginDto.registrationType === 'GOOGLE') {
    if (loginDto.googleId) {
      return this.signInWithGoogle(loginDto.googleId, req, loginDto);
    }

     if (loginDto.appleId) {
      return this.signInWithApple(loginDto.appleId, req, loginDto);
    }

    // Check if this is a Twitter access token login
    if (loginDto.twitterId) {
      return this.twitterLogin(loginDto.twitterId, req, loginDto);
    }

    const user = await this.validateUser(loginDto);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const meta = this.buildSessionMeta(req, loginDto);
    const tokens = await this.issueTokensForUser(user, meta);
    await this.upsertDeviceAccount(user.id, meta?.deviceId);

    // Save login history
    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        location: meta?.location,
      },
    });

    // Preserve existing behavior: mark access as false on normal login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { canAccessPlatform: 'false' },
    });

    return {
      ...tokens,
      ...user,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userService.getUserById(userId);
    return {
      message: 'Profile fetched successfully',
      user
    };
  }

  async getLoginHistory(userId: string, limit: number = 50) {
    const loginHistory = await this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginDate: 'desc' },
      take: Math.min(Math.max(1, limit), 100),
    });

    return {
      message: 'Login history fetched successfully',
      loginHistory,
    };
  }

  async refreshToken(refreshToken: string, req?: any) {
    const now = new Date();
    const tokenHash = this.hashToken(refreshToken);

    let session = await this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        refreshTokenExpiresAt: { gt: now },
        revokedAt: null,
      },
      include: { user: true },
    });

    // Legacy fallback
    if (!session) {
      const user = await this.prisma.user.findFirst({
        where: {
          refreshToken,
          refreshTokenExpiresAt: { gt: now },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      session = await this.prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: tokenHash,
          refreshTokenExpiresAt: user.refreshTokenExpiresAt ?? now,
          lastActiveAt: now,
        },
        include: { user: true },
      });
    }

    if (!session.user || session.revokedAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate refresh token
    const newRefreshToken = randomBytes(32).toString('hex');
    const newRefreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const meta = this.buildSessionMeta(req);

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashToken(newRefreshToken),
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
        lastActiveAt: now,
        userAgent: meta.userAgent ?? session.userAgent,
        ipAddress: meta.ipAddress ?? session.ipAddress,
      },
    });

    // Keep legacy fields for backward compatibility
    await this.prisma.user.update({
      where: { id: session.user.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      },
    });

    // Generate new access token
    const payload = {
      sub: session.user.id,
      email: session.user.email,
      registrationType: session.user.registrationType,
      sessionId: session.id,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      refresh_token: newRefreshToken,
      session_id: session.id,
    };
  }

  async signInWithGoogle(idToken: string, req?: any, loginDto?: any) {
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
      const email = decodedToken.email ? decodedToken.email.trim().toLowerCase() : undefined;
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
            throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
          }
  
          // Check email verification for password provider
          if (provider === 'password' && existingUser.verifyEmail !== 1) {
            throw new BadRequestException('Please verify your email before signing in.');
          }
  
          const meta = this.buildSessionMeta(req, loginDto);
          const tokens = await this.issueTokensForUser(existingUser, meta);
          await this.upsertDeviceAccount(existingUser.id, meta?.deviceId);

          // Save login history
          await this.prisma.loginHistory.create({
            data: {
              userId: existingUser.id,
              location: meta?.location,
            },
          });

          return {
            ...tokens,
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
            userName:loginDto?.userName || decodedToken.name || 'Unknown User',
            profile: loginDto?.profile || null,
            googleId: provider === 'google.com' ? firebaseUserId : null,
            registrationType: loginType,
            verifyEmail: 1, // Firebase users are verified
          };
  
          // Create user
          const newUser = await this.prisma.user.create({
            data: userData,
          });
  
          const meta = this.buildSessionMeta(req, loginDto);
          const tokens = await this.issueTokensForUser(newUser, meta);
          await this.upsertDeviceAccount(newUser.id, meta?.deviceId);
          await this.userService.sendWelcomeOnboardingNotification(newUser.id);

          // Save login history
          await this.prisma.loginHistory.create({
            data: {
              userId: newUser.id,
              location: meta?.location,
            },
          });

          return {
            ...tokens,
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

    async signInWithApple(idToken: string, req?: any, loginDto?: any) {
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
      const email = decodedToken.email ? decodedToken.email.trim().toLowerCase() : undefined;
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
            throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
          }
  
          // Check email verification for password provider
          if (provider === 'password' && existingUser.verifyEmail !== 1) {
            throw new BadRequestException('Please verify your email before signing in.');
          }
  
          const meta = this.buildSessionMeta(req, loginDto);
          const tokens = await this.issueTokensForUser(existingUser, meta);

          // Save login history
          await this.prisma.loginHistory.create({
            data: {
              userId: existingUser.id,
              location: meta?.location,
            },
          });

          return {
            ...tokens,
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
            userName: loginDto?.userName || decodedToken.name || 'Unknown User',
            profile: loginDto?.profile || null,
            googleId: provider === 'google.com' ? firebaseUserId : null,
            registrationType: loginType,
            verifyEmail: 1, // Firebase users are verified
          };

          // Create user
          const newUser = await this.prisma.user.create({
            data: userData,
          });

          const meta = this.buildSessionMeta(req, loginDto);
          const tokens = await this.issueTokensForUser(newUser, meta);
          await this.userService.sendWelcomeOnboardingNotification(newUser.id);

          // Save login history
          await this.prisma.loginHistory.create({
            data: {
              userId: newUser.id,
              location: meta?.location,
            },
          });

          return {
            ...tokens,
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
  async twitterLogin(accessToken: string, req?: any, loginDto?: any) {
    try {
      if (!accessToken) {
        throw new BadRequestException('Missing Twitter access token');
      }

      // Fetch user info from Twitter API
      const response = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const twitterUser = response.data.data;
      if (!twitterUser) {
        throw new BadRequestException('Failed to fetch user info from Twitter');
      }

      const twitterId = twitterUser.id;
      const email = twitterUser.email ? twitterUser.email.trim().toLowerCase() : null;
      const userName = loginDto?.userName || twitterUser.name || twitterUser.username;
      const profile = loginDto?.profile || null;

      // Check if user already exists
      let existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { twitterId },
            email ? { email } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (existingUser && existingUser.isDeleted === 1) {
        throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
      }

      // If not found, create new user
      if (!existingUser) {
        const newUser = await this.prisma.user.create({
          data: {
            id: uuidv4(),
            twitterId,
            email,
            userName,
            profile,
            registrationType: 'TWITTER',
            verifyEmail: 1,
          },
        });
        existingUser = newUser;
        await this.userService.sendWelcomeOnboardingNotification(newUser.id);
      }

      const meta = this.buildSessionMeta(req, loginDto);
      const tokens = await this.issueTokensForUser(existingUser, meta);
      await this.upsertDeviceAccount(existingUser.id, meta?.deviceId);

      // Save login history
      await this.prisma.loginHistory.create({
        data: {
          userId: existingUser.id,
          location: meta?.location,
        },
      });

      return {
        ...tokens,
        ...existingUser,
      };
    } catch (error) {
      if (typeof error === 'object' && error && 'response' in error && error.response && 'data' in error.response) {
        console.error('Twitter login error:', (error as any).response.data);
      } else if (error instanceof Error) {
        console.error('Twitter login error:', error.message);
      } else {
        console.error('Twitter login error:', error);
      }
      throw new BadRequestException('Twitter login failed');
    }
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        refreshTokenExpiresAt: { gt: new Date() },
      },
      orderBy: [{ lastActiveAt: 'desc' }, { createdAt: 'desc' }],
    });

    const sessionDtos = await Promise.all(
      sessions.map(async (s) => {
        const locationName = await this.getLocationName(s.location || undefined);
        return {
          id: s.id,
          deviceName: s.deviceName,
          deviceType: s.deviceType,
          deviceId: s.deviceId,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          location: s.location,
          locationName,
          lastActiveAt: s.lastActiveAt,
          createdAt: s.createdAt,
          isCurrent: currentSessionId ? s.id === currentSessionId : false,
        };
      }),
    );

    return {
      sessions: sessionDtos,
    };
  }

  async logoutCurrentSession(userId: string, sessionId?: string) {
    if (!sessionId) {
      throw new BadRequestException('Session id not found in token');
    }
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.clearFcmTokenForUser(userId);
    return { message: 'Logged out from current session' };
  }

  async logoutSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.clearFcmTokenForUser(userId);
    return { message: 'Session logged out successfully' };
  }

  async logoutAllSessions(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.clearFcmTokenForUser(userId);
    return { message: 'All sessions logged out successfully' };
  }

  private async clearFcmTokenForUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }

  async listDeviceAccounts(currentUserId: string, deviceId: string) {
    if (!deviceId?.trim()) throw new BadRequestException('Device id is required');

    const hasAccess = await this.prisma.deviceAccount.findFirst({
      where: { deviceId, userId: currentUserId, removedAt: null },
    });
    if (!hasAccess) {
      throw new UnauthorizedException('Device not authorized for this user');
    }

    const accounts = await this.prisma.deviceAccount.findMany({
      where: { deviceId, removedAt: null },
      orderBy: [{ lastLoginAt: 'desc' }, { addedAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            userName: true,
            email: true,
            image: true,
            profile: true,
            isDeleted: true,
          },
        },
      },
    });

    return {
      deviceId,
      accounts: accounts
        .filter((a) => a.user?.isDeleted !== 1)
        .map((a) => ({
          id: a.user.id,
          displayName: a.user.displayName,
          userName: a.user.userName,
          email: a.user.email,
          image: a.user.image,
          profile: a.user.profile,
          isPrimary: a.isPrimary,
          addedAt: a.addedAt,
          lastLoginAt: a.lastLoginAt,
          isCurrent: a.user.id === currentUserId,
        })),
    };
  }

  async switchAccount(currentUserId: string, deviceId: string, targetUserId: string, req?: any) {
    if (!currentUserId?.trim()) throw new UnauthorizedException('Invalid user');
    if (!deviceId?.trim()) throw new BadRequestException('Device id is required');
    if (!targetUserId?.trim()) throw new BadRequestException('Target user id is required');

    const currentDeviceAccount = await this.prisma.deviceAccount.findFirst({
      where: { deviceId, userId: currentUserId, removedAt: null },
    });
    if (!currentDeviceAccount) {
      throw new UnauthorizedException('Device not authorized for this user');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new BadRequestException('Target account not found');
    }
    if (targetUser.isDeleted === 1) {
      throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
    }

    const targetDeviceAccount = await this.prisma.deviceAccount.findFirst({
      where: { deviceId, userId: targetUserId, removedAt: null },
    });
    if (!targetDeviceAccount) {
      throw new UnauthorizedException('Account not available on this device');
    }

    const meta = this.buildSessionMeta(req, { deviceId });
    const tokens = await this.issueTokensForUser(targetUser, meta);

    await this.prisma.deviceAccount.update({
      where: { id: targetDeviceAccount.id },
      data: { lastLoginAt: new Date() },
    });

    return tokens;
  }

  async removeDeviceAccount(currentUserId: string, deviceId: string, targetUserId: string) {
    if (!deviceId?.trim()) throw new BadRequestException('Device id is required');
    if (!targetUserId?.trim()) throw new BadRequestException('User id is required');

    const hasAccess = await this.prisma.deviceAccount.findFirst({
      where: { deviceId, userId: currentUserId, removedAt: null },
    });
    if (!hasAccess) {
      throw new UnauthorizedException('Device not authorized for this user');
    }

    const existing = await this.prisma.deviceAccount.findFirst({
      where: { deviceId, userId: targetUserId, removedAt: null },
    });
    if (!existing) {
      throw new BadRequestException('Account not found on this device');
    }

    await this.prisma.deviceAccount.update({
      where: { id: existing.id },
      data: { removedAt: new Date(), isPrimary: false },
    });

    await this.prisma.userSession.updateMany({
      where: { userId: targetUserId, deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Account removed from device' };
  }
}
