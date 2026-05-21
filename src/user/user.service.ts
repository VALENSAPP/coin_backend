import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Gender } from './user.controller';
import { randomBytes, createHash } from 'crypto';
import { Express } from 'express';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import * as path from 'path';
import * as sgMail from '@sendgrid/mail';
import { JwtService } from '@nestjs/jwt';
import { uploadImageToS3 } from '../common/s3.util';
// Valens: no wallet creation; users connect third-party non-custodial wallets.
// import { generateWallet } from '../common/wallet.util';
// import { encryptSecret } from '../common/crypto.util';
// import admin from '../auth/firebase.config';
// import admin from '../auth/firebase.config';
import * as admin from 'firebase-admin';
import { TOTPUtil } from '../common/totp.util';
import axios from 'axios';
import { KycService } from '../kyc/kyc.service';
import { NotificationService } from '../notification/notification.service';

// ✅ Use environment variables for Firebase config (more secure)
// Prevent re-initializing Firebase if already initialized
if (!admin.apps.length) {
  try {
    // Try to use environment variables first
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const serviceAccount: admin.ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        databaseURL: 'https://nexgenfren.firebaseio.com',
      });

      console.log('🔥 Firebase Admin initialized successfully with environment variables');
    } else {
      // Fallback to JSON file if env vars not available
      const serviceAccountPath = path.join(process.cwd(), 'config', 'service-account-key.json');
      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        databaseURL: 'https://nexgenfren.firebaseio.com',
      });

      console.log('🔥 Firebase Admin initialized successfully with JSON file');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw new Error('Firebase initialization failed. Please check your Firebase configuration.');
  }
}

// Add AWS and nodemailer stubs
// import * as AWS from 'aws-sdk';
// import * as nodemailer from 'nodemailer';

export type RegistrationType = 'NORMAL' | 'GOOGLE' | 'TWITTER' | 'WALLET' | 'APPLE';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly kycService: KycService,
    private readonly notificationService: NotificationService,
  ) { }

  async updateFirstLogAfterKyc(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, kyc: true, first_log: true },
    });

    if (!user) throw new BadRequestException('User not found');

    if (!user.kyc) {
      return { updated: false, reason: 'kyc_false', first_log: user.first_log };
    }

    if (!user.first_log) {
      return { updated: false, reason: 'already_false', first_log: user.first_log };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { first_log: false },
      select: { id: true, kyc: true, first_log: true },
    });

    return { updated: true, reason: 'updated', first_log: updatedUser.first_log };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createSession(userId: string, refreshToken: string, refreshTokenExpiresAt: Date, meta?: any) {
    return this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        refreshTokenExpiresAt,
        lastActiveAt: new Date(),
        deviceId: meta?.deviceId,
        deviceName: meta?.deviceName,
        deviceType: meta?.deviceType,
        location: meta?.location,
      },
    });
  }

  private async issueTokensForUser(user: any, meta?: any) {
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days

    const session = await this.createSession(user.id, refreshToken, refreshTokenExpiresAt, meta);

    const payload = {
      sub: user.id,
      email: user.email,
      registrationType: user.registrationType,
      sessionId: session.id,
    };
    const access_token = this.jwtService.sign(payload);

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

  private buildSessionMetaFromRegister(data: {
    deviceId?: string;
    deviceName?: string;
    deviceType?: string;
    location?: string;
    userName?: string;
    profile?: string;
  }) {
    return {
      deviceId: data?.deviceId,
      deviceName: data?.deviceName,
      deviceType: data?.deviceType,
      location: data?.location,
      userName: data?.userName,
      profile: data?.profile,
    };
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

  private async generateUniqueReferCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const existing = await this.prisma.user.findFirst({
        where: { referCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('Failed to generate referral code');
  }

  async register(data: {
    email?: string;
    userName?: string;
    profile?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    appleId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
    fcmToken?: string;
    referrerCode?: string;
    deviceId?: string;
    deviceName?: string;
    deviceType?: string;
    location?: string;
  }) {
    const normalizedEmail = data.email ? data.email.trim().toLowerCase() : undefined;
    // Check if this is a Firebase Google registration request
    // if (data.idToken && data.registrationType === 'GOOGLE') {
    if (data.googleId) {
      return this.signInWithGoogle(data.googleId, this.buildSessionMetaFromRegister(data));
    }

    if (data.appleId) {
      return this.signInWithApple(data.appleId, this.buildSessionMetaFromRegister(data));
    }

    if (data.twitterId) {
      return this.twitterLogin(data.twitterId, this.buildSessionMetaFromRegister(data));
    }
    // Validate username is required for NORMAL registration
    if (data.registrationType === 'NORMAL' && (!data.userName || data.userName.trim() === '')) {
      throw new BadRequestException('Username is required');
    }

    if (data.registrationType === 'NORMAL') {
      if (!normalizedEmail || !data.password) {
        throw new BadRequestException('Email and password required');
      }
      const normalizedUserName = data.userName!.trim();

      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUserByEmail) {
        if (existingUserByEmail.deletedAt !== null) {
          throw new BadRequestException('Email previously registered. Please contact support for account recovery.');
        }

        if (existingUserByEmail.isDeleted === 1) {
          throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
        }

        if (existingUserByEmail.verifyEmail === 1) {
          throw new BadRequestException('Email already registered');
        }

        if (existingUserByEmail.userName !== normalizedUserName) {
          const userNameTaken = await this.prisma.user.findFirst({
            where: {
              userName: normalizedUserName,
              deletedAt: null,
              id: { not: existingUserByEmail.id },
            },
            select: { id: true },
          });
          if (userNameTaken) {
            throw new BadRequestException('Username already taken');
          }
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        const updatedUser = await this.prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            password: passwordHash,
            userName: normalizedUserName,
            ...(data.profile ? { profile: data.profile } : {}),
            ...(data.fcmToken ? { fcmToken: data.fcmToken } : {}),
            registrationType: 'NORMAL',
          },
        });

        const meta = this.buildSessionMetaFromRegister(data);
        await this.upsertDeviceAccount(updatedUser.id, meta?.deviceId);
        const tokens = await this.issueTokensForUser(updatedUser, meta);
        return {
          ...tokens,
          user: updatedUser,
        };
      }

      const existingUserName = await this.prisma.user.findFirst({
        where: { userName: normalizedUserName, deletedAt: null },
        select: { id: true },
      });
      if (existingUserName) {
        throw new BadRequestException('Username already taken');
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      let user;

      try {
        const trimmedReferrerCode = data.referrerCode?.trim();
        const referrer = trimmedReferrerCode
          ? await this.prisma.user.findFirst({
            where: { referCode: trimmedReferrerCode, isDeleted: 0 },
          })
          : null;

        if (trimmedReferrerCode && !referrer) {
          throw new BadRequestException('Invalid referral code');
        }

        const referCode = await this.generateUniqueReferCode();
        const initialReferPoints = 1000 + (referrer ? 500 : 0);

        const userData: any = {
          email: normalizedEmail,
          password: passwordHash,
          registrationType: 'NORMAL',
          referCode,
          referPoints: initialReferPoints,
          totalPlatformPoints: initialReferPoints,
          userName: normalizedUserName,
        };

        if (data.profile) {
          userData.profile = data.profile;
        }
        if (data.fcmToken) {
          userData.fcmToken = data.fcmToken;
        }

        user = await this.prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: userData,
          });

          if (referrer) {
            await tx.user.update({
              where: { id: referrer.id },
              data: {
                referPoints: { increment: 500 },
                totalPlatformPoints: { increment: 500 },
              },
            });

            await tx.userReferral.create({
              data: {
                referrerId: referrer.id,
                referredUserId: createdUser.id,
                referrerPoints: 500,
                referredUserPoints: 500,
              },
            });
          }

          return createdUser;
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          const field = error.meta?.target?.[0];
          if (field === 'email') {
            throw new BadRequestException('Email already registered');
          } else if (field === 'userName') {
            throw new BadRequestException('Username already taken');
          }
          throw new BadRequestException(`Unique constraint violation on field: ${field}`);
        }
        throw error;
      }

      const meta = this.buildSessionMetaFromRegister(data);
      const tokens = await this.issueTokensForUser(user, meta);
      await this.upsertDeviceAccount(user.id, meta?.deviceId);
      return {
        ...tokens,
        user,
      };
    }

    // Special case: If all of twitterId, walletAddress, and googleId are present
    if (data.walletAddress) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          walletAddress: data.walletAddress,
          deletedAt: null,
          userName: data.userName,
        },
      });
      if (existingUser) {
        const meta = this.buildSessionMetaFromRegister(data);
        await this.upsertDeviceAccount(existingUser.id, meta?.deviceId);
        const tokens = await this.issueTokensForUser(existingUser, meta);
        return {
          ...tokens,
          user: existingUser,
        };
      }
      // If not found, proceed to registration as usual
    }
    // Check for existing user by unique fields (exclude soft-deleted)
    if (normalizedEmail) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: normalizedEmail, userName: data.userName },
      });
      if (existingUser) {
        if (existingUser.deletedAt === null) {
          if (existingUser.isDeleted === 1) {
            throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
          }
          throw new BadRequestException('Email already registered');
        } else {
          // Soft-deleted user exists, we'll allow re-registration but need to handle carefully
          // For now, throw error to prevent conflicts
          throw new BadRequestException('Email previously registered. Please contact support for account recovery.');
        }
      }
    }
    if (
      data.googleId &&
      await this.prisma.user.findFirst({ where: { googleId: data.googleId, deletedAt: null } })
    ) {
      const existingUser = await this.prisma.user.findFirst({ where: { googleId: data.googleId, deletedAt: null } });
      if (existingUser && existingUser.isDeleted === 1) {
        throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
      }
      throw new BadRequestException('Google account already registered');
    }
    if (
      data.twitterId &&
      await this.prisma.user.findFirst({ where: { twitterId: data.twitterId, deletedAt: null } })
    ) {
      const existingUser = await this.prisma.user.findFirst({ where: { twitterId: data.twitterId, deletedAt: null } });
      if (existingUser && existingUser.isDeleted === 1) {
        throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
      }
      throw new BadRequestException('Twitter account already registered');
    }
    if (
      data.walletAddress &&
      await this.prisma.user.findFirst({ where: { walletAddress: data.walletAddress, deletedAt: null } })
    ) {
      const existingUser = await this.prisma.user.findFirst({ where: { walletAddress: data.walletAddress, deletedAt: null } });
      if (existingUser && existingUser.isDeleted === 1) {
        throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
      }
      throw new BadRequestException('Wallet address already registered');
    }
    // Check if username already exists (only if provided)
    if (data.userName) {
      const existingUserName = await this.prisma.user.findFirst({
        where: { userName: data.userName, deletedAt: null }
      });
      if (existingUserName) {
        throw new BadRequestException('Username already taken');
      }
    }
    const passwordHash = undefined;
    // Valens: do NOT create wallets. Store only user-provided walletAddress when they connect (e.g. MetaMask).
    // const wallet = generateWallet();
    // const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
    // const encryptedPrivateKey = encryptSecret(wallet.privateKey, encryptionKey);
    // const encryptedMnemonic = encryptSecret(wallet.mnemonic, encryptionKey);

    let user;
    try {
      const trimmedReferrerCode = data.referrerCode?.trim();
      const referrer = trimmedReferrerCode
        ? await this.prisma.user.findFirst({
          where: { referCode: trimmedReferrerCode, isDeleted: 0 },
        })
        : null;

      if (trimmedReferrerCode && !referrer) {
        throw new BadRequestException('Invalid referral code');
      }

      const referCode = await this.generateUniqueReferCode();
      const initialReferPoints = 1000 + (referrer ? 500 : 0);

      const userData: any = {
        email: normalizedEmail,
        password: passwordHash,
        googleId: data.googleId,
        twitterId: data.twitterId,
        walletAddress: data.walletAddress ?? undefined,
        // walletPrivateKey: encryptedPrivateKey,
        // walletMnemonic: encryptedMnemonic,
        registrationType: data.registrationType,
        referCode,
        referPoints: initialReferPoints,
        totalPlatformPoints: initialReferPoints,
      };
      if (data.userName) {
        userData.userName = data.userName;
      }
      if (data.profile) {
        userData.profile = data.profile;
      }
      if (data.fcmToken) {
        userData.fcmToken = data.fcmToken;
      }
      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: userData,
        });

        if (referrer) {
          await tx.user.update({
            where: { id: referrer.id },
            data: {
              referPoints: { increment: 500 },
              totalPlatformPoints: { increment: 500 },
            },
          });

          await tx.userReferral.create({
            data: {
              referrerId: referrer.id,
              referredUserId: createdUser.id,
              referrerPoints: 500,
              referredUserPoints: 500,
            },
          });
        }

        return createdUser;
      });
    } catch (error: any) {
      // Handle Prisma unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'email') {
          throw new BadRequestException('Email already registered');
        } else if (field === 'walletAddress') {
          throw new BadRequestException('Wallet address already registered');
        } else if (field === 'googleId') {
          throw new BadRequestException('Google account already registered');
        } else if (field === 'twitterId') {
          throw new BadRequestException('Twitter account already registered');
        } else {
          throw new BadRequestException(`Unique constraint violation on field: ${field}`);
        }
      }
      throw error;
    }

    const meta = this.buildSessionMetaFromRegister(data);
    const tokens = await this.issueTokensForUser(user, meta);
    await this.upsertDeviceAccount(user.id, meta?.deviceId);
    return {
      ...tokens,
      user,
    };
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
      const normalizedEmail = data.email.trim().toLowerCase();
      user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        throw new BadRequestException('User not registered');
      }
      // need to uncomment the code after the email is working properly, to avoid blocking users who registered before email verification was implemented
      // if (user.verifyEmail !== 1) {
      //   throw new BadRequestException('User not registered. Please verify your email first.');
      // }
      if (!user.password || !(await bcrypt.compare(data.password, user.password))) {
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

    // Check if account is deleted
    if (user && user.isDeleted === 1) {
      throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
    }

    return {
      ...user,
    };
  }

  // Profile edit
  async editProfile(userId: string, dto: any, image?: Express.Multer.File) {
    if (!userId) throw new BadRequestException('User ID required');

    console.log('EditProfile DTO received:', dto);

    // Get current user to check existing wallet address
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) throw new BadRequestException('User not found');

    console.log('Current user wallet address:', currentUser.walletAddress);

    // Check if user is trying to update wallet address when one already exists
    // This check should happen BEFORE any image upload to avoid delays
    console.log('Wallet validation:', {
      dtoWalletAddress: dto.walletAddress,
      currentUserWalletAddress: currentUser.walletAddress,
      hasWalletAddress: dto.walletAddress !== undefined && dto.walletAddress !== '' && dto.walletAddress !== null,
      hasExistingWallet: !!currentUser.walletAddress
    });

    if (dto.walletAddress !== undefined && dto.walletAddress !== '' && dto.walletAddress !== null && currentUser.walletAddress) {
      console.log('Throwing wallet address error');
      throw new BadRequestException('Wallet address already exists. Please contact admin for wallet address changes.');
    }

    let imageUrl = undefined;
    if (image) {
      imageUrl = await uploadImageToS3(image, 'profile-images');
    }

    const data: any = {};

    // Handle new fields with empty string validation
    if (dto.userName !== undefined && dto.userName !== '' && dto.userName !== null) {
      data.userName = dto.userName;
    }
    if (dto.displayName !== undefined && dto.displayName !== '' && dto.displayName !== null) {
      data.displayName = dto.displayName;
    }
    if (dto.bio !== undefined && dto.bio !== '' && dto.bio !== null) {
      data.bio = dto.bio;
    }
    if (dto.walletAddress !== undefined && dto.walletAddress !== '' && dto.walletAddress !== null) {
      data.walletAddress = dto.walletAddress;
    }

    // Handle existing fields with proper validation
    if (dto.phoneNumber !== undefined && dto.phoneNumber !== '' && dto.phoneNumber !== null) {
      data.phoneNumber = dto.phoneNumber;
    }

    if (dto.website_link !== undefined && dto.website_link !== '' && dto.website_link !== null) {
      data.website_link = dto.website_link;
    }

    if (dto.social_media_links !== undefined) {
      if (typeof dto.social_media_links === 'string') {
        data.social_media_links = dto.social_media_links.trim() ? (JSON.parse(dto.social_media_links) as unknown) : [];
      } else if (Array.isArray(dto.social_media_links)) {
        data.social_media_links = dto.social_media_links;
      }
    }

    if (dto.gender !== undefined && dto.gender !== '' && dto.gender !== null) {
      // Validate gender enum value
      const validGenders = ['MALE', 'FEMALE', 'OTHER'];
      if (validGenders.includes(dto.gender)) {
        data.gender = dto.gender;
      } else {
        throw new BadRequestException('Invalid gender value. Must be MALE, FEMALE, or OTHER');
      }
    }
    if (dto.age !== undefined && dto.age !== '' && dto.age !== null) {
      data.age = Number(dto.age);
    }
    if (imageUrl) data.image = imageUrl;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    const dashboardData = await this.getUserDashboard(userId);
    return { ...user, ...dashboardData };
  }

  // Forgot password: generate OTP, save to user, send email (stub)
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Email not registered');
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit numeric OTP
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      // Read HTML template
      const fs = require('fs');
      const path = require('path');
      const templatePath = path.join(process.cwd(), 'public', 'otp-email.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      // Replace placeholders
      const userName = user.displayName || user.userName || 'User';
      htmlTemplate = htmlTemplate.replace(/{{user_name}}/g, userName);
      htmlTemplate = htmlTemplate.replace(/{{otp_code}}/g, otp);

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: 'Your Password Reset OTP',
        html: htmlTemplate,
        text: `Your OTP for password reset is: ${otp}`, // Fallback for email clients that don't support HTML
      });
    } catch (error) {
      console.error('SendGrid error:', error);
      throw new BadRequestException('Failed to send email. Please check your email address or try again later.');
    }
    return true;
  }

  // Verify OTP
  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.otp || !user.otpExpiresAt) throw new BadRequestException('OTP not found');
    if (user.otp !== otp) throw new BadRequestException('Invalid OTP');
    if (user.otpExpiresAt < new Date()) throw new BadRequestException('OTP expired');
    // Clear OTP after verification
    await this.prisma.user.update({
      where: { email },
      data: { otp: null, otpExpiresAt: null },
    });
    return true;
  }

  // SendGrid email OTP for email verification
  async sendEmailOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Email not registered');
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit numeric OTP
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      // Read HTML template from emailOtp.html
      const fs = require('fs');
      const path = require('path');
      const templatePath = path.join(process.cwd(), 'public', 'emailOtp.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      // Replace placeholders
      const userName = user.displayName || user.userName || 'User';
      htmlTemplate = htmlTemplate.replace(/{{user_name}}/g, userName);
      htmlTemplate = htmlTemplate.replace(/{{otp_code}}/g, otp);

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: 'Your Email Verification OTP',
        html: htmlTemplate,
        text: `Your OTP for email verification is: ${otp}. This OTP will expire in 10 minutes.`,
      });
    } catch (error) {
      console.error('SendGrid error:', error);
      throw new BadRequestException('Failed to send email. Please check your email address or try again later.');
    }

    return true;
  }

  async verifyEmailOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const masterOtp = process.env.MASTER_OTP || "123456"; // Use env var or fallback

    if (!user) throw new BadRequestException('User not found');

    // If master OTP is used, skip user.otp checks
    if (otp === masterOtp) {
      await this.prisma.user.update({
        where: { email },
        data: { otp: null, otpExpiresAt: null, verifyEmail: 1 },
      });
      return true;
    }

    // Otherwise, check user's OTP
    if (!user.otp || !user.otpExpiresAt) throw new BadRequestException('OTP not found');
    if (user.otp !== otp) throw new BadRequestException('Invalid OTP');
    if (user.otpExpiresAt < new Date()) throw new BadRequestException('OTP expired');
    await this.prisma.user.update({
      where: { email },
      data: { otp: null, otpExpiresAt: null, verifyEmail: 1 },
    });
    return true;
  }

  async resetPassword(email: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: passwordHash, otp: null, otpExpiresAt: null },
    });
    return true;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!user.password) throw new BadRequestException('User does not have a password set');
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) throw new BadRequestException('Old password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
    return true;
  }

  // Get user by ID (exclude soft-deleted)
  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new BadRequestException('User not found');

    // Get KYC status
    const kycStatus = await this.kycService.getKycStatus(id);

    return {
      ...user,
      kycStatus: kycStatus?.status || null,
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId || !followingId) return false;
    if (followerId === followingId) return false;
    const record = await this.prisma.followerAndFollowing.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return !!record && record.status === 'ACCEPTED';
  }

  // Get all users (exclude soft-deleted) with optional search filters
  async getAllUsers(query?: {
    email?: string;
    userName?: string;
    googleId?: string;
    twitterId?: string;
    phoneNumber?: string;
    displayName?: string;
  }) {
    const where: any = { deletedAt: null };

    if (query) {
      const orConditions = [];

      if (query.email) {
        orConditions.push({ email: { contains: query.email, mode: 'insensitive' } });
      }
      if (query.userName) {
        orConditions.push({ userName: { contains: query.userName, mode: 'insensitive' } });
      }
      if (query.googleId) {
        orConditions.push({ googleId: { contains: query.googleId, mode: 'insensitive' } });
      }
      if (query.twitterId) {
        orConditions.push({ twitterId: { contains: query.twitterId, mode: 'insensitive' } });
      }
      if (query.phoneNumber) {
        orConditions.push({ phoneNumber: { contains: query.phoneNumber, mode: 'insensitive' } });
      }
      if (query.displayName) {
        orConditions.push({ displayName: { contains: query.displayName, mode: 'insensitive' } });
      }
      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    const take = 100;
    return this.prisma.user.findMany({ where, take, orderBy: { createdAt: 'desc' } });
  }

  // Soft delete user
  async softDeleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('User not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async followPerson(followerId: string, followingId: string) {
    if (!followingId) throw new BadRequestException('Following ID is required');
    if (followerId === followingId) throw new BadRequestException('Cannot follow yourself');
    // Check if already following
    const existing = await this.prisma.followerAndFollowing.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) throw new BadRequestException('Already following this user');

    const result = await this.prisma.followerAndFollowing.create({
      data: { followerId, followingId, status: 'ACCEPTED' },
    });

    // Send notification to the person being followed
    try {
      await this.notificationService.sendNewFollower(followingId, followerId);
    } catch (error) {
      console.error('Failed to send follow notification:', error);
    }

    return result;
  }

  async getFollowersList(userId: string) {
    return this.prisma.followerAndFollowing.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      include: { follower: true },
    });
  }

  async getFollowersGraph(userId: string, range: 'daily' | 'weekly' = 'weekly') {
    if (!userId) throw new BadRequestException('User ID required');
    const normalizedRange = range === 'daily' ? 'daily' : 'weekly';

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const now = new Date();
    const isDaily = normalizedRange === 'daily';
    const bucketCount = isDaily ? 24 : 7;
    const bucketMs = isDaily ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const startDate = new Date(now.getTime() - (bucketCount - 1) * bucketMs);

    if (!isDaily) {
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setMinutes(0, 0, 0);
    }

    const [totalFollowers, followersBeforeRange, followersInRange] = await Promise.all([
      this.prisma.followerAndFollowing.count({
        where: { followingId: userId, status: 'ACCEPTED' },
      }),
      this.prisma.followerAndFollowing.count({
        where: {
          followingId: userId,
          status: 'ACCEPTED',
          createdAt: { lt: startDate },
        },
      }),
      this.prisma.followerAndFollowing.findMany({
        where: {
          followingId: userId,
          status: 'ACCEPTED',
          createdAt: { gte: startDate, lte: now },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(startDate.getTime() + index * bucketMs);
      return {
        label: isDaily
          ? bucketStart.toISOString().slice(11, 16)
          : bucketStart.toISOString().slice(0, 10),
        date: bucketStart.toISOString(),
        newFollowers: 0,
        followers: followersBeforeRange,
      };
    });

    for (const follow of followersInRange) {
      const bucketIndex = Math.min(
        bucketCount - 1,
        Math.max(0, Math.floor((follow.createdAt.getTime() - startDate.getTime()) / bucketMs)),
      );
      buckets[bucketIndex].newFollowers += 1;
    }

    let runningTotal = followersBeforeRange;
    for (const bucket of buckets) {
      runningTotal += bucket.newFollowers;
      bucket.followers = runningTotal;
    }

    return {
      userId,
      range: normalizedRange,
      totalFollowers,
      points: buckets,
    };
  }

  // Valens: display follower/following only; no token addresses or pricing.
  async getFollowingList(userId: string) {
    return this.prisma.followerAndFollowing.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      include: {
        following: true,
        // userTokens / tokenAddress removed: no token display per requirements
      },
    });
  }

  async unfollow(followerId: string, followingId: string) {
    if (!followingId) throw new BadRequestException('Following ID is required');
    const existing = await this.prisma.followerAndFollowing.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing || existing.status !== 'ACCEPTED') throw new BadRequestException('Not following this user');

    const result = await this.prisma.followerAndFollowing.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    // Send notification to the person being unfollowed
    try {
      const follower = await this.prisma.user.findUnique({
        where: { id: followerId },
        select: { displayName: true, userName: true },
      });
      const followerName = follower?.displayName || follower?.userName || 'Someone';

      await this.notificationService.sendNotificationToUser(
        followingId,
        'Follower Unfollowed',
        `${followerName} unfollowed you.`,
        { type: 'unfollow', followerId, followingId }
      );
    } catch (error) {
      console.error('Failed to send unfollow notification:', error);
    }

    return result;
  }

  async getPendingFollowRequests(userId: string) {
    // Since we removed the request concept, return empty array
    return [];
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (!blockedId) throw new BadRequestException('Blocked ID is required');
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');
    // Check if already blocked
    const existing = await this.prisma.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) throw new BadRequestException('User already blocked');
    return this.prisma.blockedUser.create({
      data: { blockerId, blockedId },
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    if (!blockedId) throw new BadRequestException('Blocked ID is required');
    const existing = await this.prisma.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (!existing) throw new BadRequestException('User is not blocked');
    return this.prisma.blockedUser.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
  }

  async getBlockedUsers(blockerId: string) {
    return this.prisma.blockedUser.findMany({
      where: { blockerId },
      include: { blocked: true },
    });
  }

  // Get all display names of all users (exclude soft-deleted)
  async getDisplayNames() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        displayName: true,
        userName: true,
        email: true,
      },
    });
    return users;
  }

  // Check display name availability and provide suggestions
  async checkDisplayNameAvailability(displayName: string) {
    if (!displayName || displayName.trim() === '') {
      throw new BadRequestException('Display name is required');
    }

    const trimmedDisplayName = displayName.trim();

    // Check if display name already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        displayName: trimmedDisplayName,
        deletedAt: null
      },
    });

    if (!existingUser) {
      return {
        status: 'approved',
        message: 'Display name is available',
        displayName: trimmedDisplayName
      };
    }

    // If display name exists, generate suggestions
    const suggestions = await this.generateDisplayNameSuggestions(trimmedDisplayName);

    return {
      status: 'taken',
      message: 'Display name is already taken',
      displayName: trimmedDisplayName,
      suggestions: suggestions
    };
  }

  // Generate display name suggestions
  private async generateDisplayNameSuggestions(baseName: string): Promise<string[]> {
    const suggestions: string[] = [];
    const baseNameLower = baseName.toLowerCase();

    // Get all existing display names to avoid duplicates
    const existingDisplayNames = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { displayName: true },
    });
    const existingNames = new Set(existingDisplayNames.map(u => u.displayName?.toLowerCase()));

    // Generate suggestions with numbers
    for (let i = 1; i <= 999; i++) {
      const suggestion = `${baseName}${i}`;
      if (!existingNames.has(suggestion.toLowerCase())) {
        suggestions.push(suggestion);
        if (suggestions.length >= 4) break;
      }
    }

    // If we don't have 4 suggestions yet, try with underscores
    if (suggestions.length < 4) {
      for (let i = 1; i <= 999; i++) {
        const suggestion = `${baseName}_${i}`;
        if (!existingNames.has(suggestion.toLowerCase())) {
          suggestions.push(suggestion);
          if (suggestions.length >= 4) break;
        }
      }
    }

    // If we still don't have 4 suggestions, try with dots
    if (suggestions.length < 4) {
      for (let i = 1; i <= 999; i++) {
        const suggestion = `${baseName}.${i}`;
        if (!existingNames.has(suggestion.toLowerCase())) {
          suggestions.push(suggestion);
          if (suggestions.length >= 4) break;
        }
      }
    }

    // If we still don't have 4 suggestions, try with random suffixes
    if (suggestions.length < 4) {
      const suffixes = ['x', 'pro', 'official', 'real', 'new', 'live', 'now', 'here'];
      for (const suffix of suffixes) {
        const suggestion = `${baseName}${suffix}`;
        if (!existingNames.has(suggestion.toLowerCase())) {
          suggestions.push(suggestion);
          if (suggestions.length >= 4) break;
        }
      }
    }

    return suggestions.slice(0, 4);
  }

  async getUserDashboard(userId: string) {
    // Get total posts count
    const totalPosts = await this.prisma.post.count({
      where: {
        userId: userId,
        deletedAt: null,
      },
    });

    // Get total following count (users this user is following)
    const totalFollowing = await this.prisma.followerAndFollowing.count({
      where: {
        followerId: userId,
        status: 'ACCEPTED',
      },
    });

    // Get total followers count (users following this user)
    const totalFollowers = await this.prisma.followerAndFollowing.count({
      where: {
        followingId: userId,
        status: 'ACCEPTED',
      },
    });

    return {
      totalPosts,
      totalFollowing,
      totalFollowers,
    };
  }

  async getHitLeft(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');

    // Calculate current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Count posts with type 'crowdfunding' or 'support' in current month
    const postCount = await this.prisma.post.count({
      where: {
        userId,
        type: { in: ['crowdfunding', 'support'] },
        createdAt: { gte: startOfMonth, lt: startOfNextMonth },
      },
    });

    // Get hitLeft
    const postHit = await this.prisma.postHit.findFirst({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const hitLeft = postHit ? postHit.hitLeft : 0;

    // Get user profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: true },
    });

    return { hitLeft, postCount, profile: user?.profile || null };
  }

  async searchUser(query: string) {
    if (!query) throw new BadRequestException('Search query required');
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { displayName: { contains: query, mode: 'insensitive' } },
          { userName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        displayName: true,
        userName: true,
        image: true,
        email: true,
      },
    });
    // Do NOT throw if users.length === 0
    return users; // Always return array (possibly empty)
  }

  async recentActivities(userId: string, type?: 'purchase' | 'sell' | 'following') {
    const result: any = {};

    if (!type || type === 'following') {
      const following = await this.prisma.followerAndFollowing.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      result.following = following.map(f => ({
        followingId: f.followingId,
        followerId: f.followerId,
        followerName: f.follower.displayName,
        createdAt: f.createdAt,
      }));
    }

    // Valens: no token purchase/sale display; revenue not linked to token activity.
    // if (!type || type === 'purchase') {
    //   const purchases = await this.prisma.tokenPurchase.findMany({ ... });
    //   result.purchase = purchases.map(...);
    // }
    // if (!type || type === 'sell') {
    //   const sales = await this.prisma.tokenSale.findMany({ ... });
    //   result.sell = sales.map(...);
    // }

    return result;
  }

  async getSuggestedUsers(userId: string, limit: number = 10) {
    if (!userId) throw new BadRequestException('User ID required');

    // Get users that the current user follows
    const following = await this.prisma.followerAndFollowing.findMany({
      where: {
        followerId: userId,
        status: 'ACCEPTED',
      },
      select: {
        followingId: true,
      },
    });

    const followingIds = following.map(f => f.followingId);

    // Get users that follow the current user
    const followers = await this.prisma.followerAndFollowing.findMany({
      where: {
        followingId: userId,
        status: 'ACCEPTED',
      },
      select: {
        followerId: true,
      },
    });

    const followerIds = followers.map(f => f.followerId);

    // Combine following and followers for mutual connections
    const mutualIds = [...new Set([...followingIds, ...followerIds])];

    if (mutualIds.length === 0) {
      // If no mutual connections, return random users excluding self
      const suggestedUsers = await this.prisma.user.findMany({
        where: {
          id: { not: userId },
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          userName: true,
          image: true,
          bio: true,
          profile: true,
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
      return suggestedUsers;
    }

    // Find users who are followed by the mutual connections (second-degree connections)
    const suggestedUsers = await this.prisma.followerAndFollowing.findMany({
      where: {
        followerId: { in: mutualIds },
        followingId: { not: userId }, // Exclude self
        status: 'ACCEPTED',
        // Exclude users already followed by current user
        NOT: {
          followingId: { in: followingIds },
        },
      },
      select: {
        following: {
          select: {
            id: true,
            displayName: true,
            userName: true,
            image: true,
            bio: true,
            profile: true,
          },
        },
      },
      distinct: ['followingId'],
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Extract the user objects
    const users = suggestedUsers.map(s => s.following);

    // If we don't have enough suggestions, fill with random users
    if (users.length < limit) {
      const existingIds = users.map(u => u.id);
      const additionalUsers = await this.prisma.user.findMany({
        where: {
          id: {
            notIn: [userId, ...existingIds, ...followingIds],
          },
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          userName: true,
          image: true,
          bio: true,
          profile: true,
        },
        take: limit - users.length,
        orderBy: {
          createdAt: 'desc',
        },
      });
      users.push(...additionalUsers);
    }

    return users.slice(0, limit);
  }

  async setProfileStatus(userId: string, profileStatus: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!profileStatus || profileStatus.trim() === '') {
      throw new BadRequestException('Profile status is required');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileStatus: profileStatus.trim() },
    });

    return {
      message: 'Profile status updated successfully',
      user: {
        id: user.id,
        profileStatus: user.profileStatus,
      },
    };
  }

  async accountDelete(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isDeleted: 1 },
    });

    return { message: 'Account deleted successfully' };
  }

  async reactivateAccount(data: {
    email?: string;
    googleId?: string;
    twitterId?: string;
    appleId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
  }) {
    let user = null;

    // Find user based on registration type
    if (data.registrationType === 'NORMAL' && data.email) {
      user = await this.prisma.user.findUnique({ where: { email: data.email } });
    } else if (data.registrationType === 'GOOGLE' && data.googleId) {
      user = await this.prisma.user.findUnique({ where: { googleId: data.googleId } });
    } else if (data.registrationType === 'TWITTER' && data.twitterId) {
      user = await this.prisma.user.findUnique({ where: { twitterId: data.twitterId } });
    } else if (data.registrationType === 'APPLE' && data.appleId) {
      user = await this.prisma.user.findFirst({ where: { email: data.email } }); // Apple uses email
    } else if (data.registrationType === 'WALLET' && data.walletAddress) {
      user = await this.prisma.user.findUnique({ where: { walletAddress: data.walletAddress } });
    } else {
      throw new BadRequestException('Invalid reactivation type or missing credentials');
    }

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isDeleted !== 1) {
      throw new BadRequestException('Account is not deleted or already active');
    }

    // Reactivate account by setting isDeleted to 0
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isDeleted: 0 },
    });

    const tokens = await this.issueTokensForUser(updatedUser);
    return {
      ...tokens,
      ...updatedUser
    };
  }

  async signInWithGoogle(idToken: string, meta?: { deviceId?: string; deviceName?: string; deviceType?: string; location?: string; userName?: string; profile?: string }) {
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

        const tokens = await this.issueTokensForUser(existingUser, meta);
        await this.upsertDeviceAccount(existingUser.id, meta?.deviceId);
        return {
          ...tokens,
          ...existingUser,
        };
      } else {
        // New user registration (Google) — Valens: do NOT create wallets.
        const firebaseUserId = decodedToken.uid;
        const userId = uuidv4();
        const referCode = await this.generateUniqueReferCode();

        // const wallet = generateWallet();
        // const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
        // const encryptedPrivateKey = encryptSecret(wallet.privateKey, encryptionKey);
        // const encryptedMnemonic = encryptSecret(wallet.mnemonic, encryptionKey);

        const userData = {
          id: userId,
          firebaseUserId,
          email,
          userName: meta?.userName || decodedToken.name || 'Unknown User',
          profile: meta?.profile || decodedToken.picture || null,
          googleId: provider === 'google.com' ? firebaseUserId : null,
          registrationType: loginType,
          verifyEmail: 1,
          referCode,
          referPoints: 0,
          totalPlatformPoints: 0,
          // walletAddress: wallet.address,
          // walletPrivateKey: encryptedPrivateKey,
          // walletMnemonic: encryptedMnemonic,
        };

        // Create user
        const newUser = await this.prisma.user.create({
          data: userData,
        });

        const tokens = await this.issueTokensForUser(newUser, meta);
        await this.upsertDeviceAccount(newUser.id, meta?.deviceId);
        return {
          ...tokens,
          ...newUser,
        };
      }
    } catch (error) {
      console.error('Firebase auth error:', error);
      return {
        error: true,
        msg: (error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? (error as any).message : 'Token verification failed'),
        body: [error],
      };
    }
  }

  async signInWithApple(idToken: string, meta?: { deviceId?: string; deviceName?: string; deviceType?: string; location?: string; userName?: string; profile?: string }) {
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

        const tokens = await this.issueTokensForUser(existingUser, meta);
        await this.upsertDeviceAccount(existingUser.id, meta?.deviceId);
        return {
          ...tokens,
          ...existingUser,
        };
      } else {
        // New user registration (Apple) — Valens: do NOT create wallets.
        const firebaseUserId = decodedToken.uid;
        const userId = uuidv4();
        const referCode = await this.generateUniqueReferCode();
        const emailUserName = email ? email.split('@')[0] : undefined;

        // const wallet = generateWallet();
        // const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
        // const encryptedPrivateKey = encryptSecret(wallet.privateKey, encryptionKey);
        // const encryptedMnemonic = encryptSecret(wallet.mnemonic, encryptionKey);

        const userData = {
          id: userId,
          firebaseUserId,
          email,
          userName: meta?.userName || decodedToken.name || emailUserName || 'Unknown User',
          profile: meta?.profile || decodedToken.picture || null,
          googleId: provider === 'google.com' ? firebaseUserId : null,
          registrationType: loginType,
          verifyEmail: 1,
          referCode,
          referPoints: 0,
          totalPlatformPoints: 0,
          // walletAddress: wallet.address,
          // walletPrivateKey: encryptedPrivateKey,
          // walletMnemonic: encryptedMnemonic,
        };

        // Create user
        const newUser = await this.prisma.user.create({
          data: userData,
        });

        const tokens = await this.issueTokensForUser(newUser, meta);
        await this.upsertDeviceAccount(newUser.id, meta?.deviceId);
        return {
          ...tokens,
          ...newUser,
        };
      }
    } catch (error) {
      console.error('Firebase auth error:', error);
      return {
        error: true,
        msg: (error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? (error as any).message : 'Token verification failed'),
        body: [error],
      };
    }
  }

  async twitterLogin(accessToken: string, meta?: { deviceId?: string; deviceName?: string; deviceType?: string; location?: string; userName?: string; profile?: string }) {
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
      const userName = meta?.userName || twitterUser.name || twitterUser.username;
      const profile = meta?.profile || twitterUser.profile_image_url || null;

      // Check if user already exists
      let existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { twitterId },
            email ? { email } : undefined,
          ].filter(Boolean) as any,
        },
      });

      // Check if account is deleted
      if (existingUser && existingUser.isDeleted === 1) {
        throw new BadRequestException('Account has been deleted. Please contact support to reactivate.');
      }

      // If not found, create new user — Valens: do NOT create wallets.
      if (!existingUser) {
        const referCode = await this.generateUniqueReferCode();
        // const wallet = generateWallet();
        // const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
        // const encryptedPrivateKey = encryptSecret(wallet.privateKey, encryptionKey);
        // const encryptedMnemonic = encryptSecret(wallet.mnemonic, encryptionKey);

        const newUser = await this.prisma.user.create({
          data: {
            id: uuidv4(),
            twitterId,
            email,
            userName,
            profile,
            registrationType: 'TWITTER',
            verifyEmail: 1,
            referCode,
            referPoints: 0,
            totalPlatformPoints: 0,
            // walletAddress: wallet.address,
            // walletPrivateKey: encryptedPrivateKey,
            // walletMnemonic: encryptedMnemonic,
          },
        });
        existingUser = newUser;
      }

      const tokens = await this.issueTokensForUser(existingUser, meta);
      await this.upsertDeviceAccount(existingUser.id, meta?.deviceId);
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

  // UserSubscription CRUD Operations

  async createUserSubscription(userId: string, dto: any) {
    if (!userId) throw new BadRequestException('User ID required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    return this.prisma.userSubscription.create({
      data: {
        userId,
        subscriptionAmount: dto.subscriptionAmount,
        status: dto.status || 'ACTIVE',
        comment: dto.comment,
        isDelete: dto.isDelete || 0,
      },
    });
  }

  async getUserSubscriptions(userId: string) {
    return this.prisma.userSubscription.findMany({
      where: {
        isDelete: 0,
        userId: userId,  // UUID filter
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }


  async getUserSubscriptionById(id: string) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) throw new BadRequestException('User subscription not found');
    return subscription;
  }

  async updateUserSubscription(id: string, dto: any) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) throw new BadRequestException('User subscription not found');

    return this.prisma.userSubscription.update({
      where: { id },
      data: {
        subscriptionAmount: dto.subscriptionAmount,
        status: dto.status,
        comment: dto.comment,
        isDelete: dto.isDelete,
        updatedAt: new Date(),
      },
    });
  }

  async deleteUserSubscription(id: string) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) throw new BadRequestException('User subscription not found');

    // Soft delete
    return this.prisma.userSubscription.update({
      where: { id },
      data: {
        isDelete: 1,
        updatedAt: new Date(),
      },
    });
  }

  async hardDeleteUserSubscription(id: string) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) throw new BadRequestException('User subscription not found');

    return this.prisma.userSubscription.delete({
      where: { id },
    });
  }

  // Two-Factor Authentication Methods

  async enableTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (user.twoFact === 1) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = TOTPUtil.generateSecret();
    const accountName = user.email || user.userName || 'User';
    const otpauthUrl = TOTPUtil.generateGoogleAuthURL(secret, accountName);

    // Store the secret temporarily (you might want to store it in a temporary field or cache)
    // For now, we'll store it directly, but in production you might want to verify first
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return {
      message: 'Two-factor authentication setup initiated',
      secret: secret,
      otpauthUrl: otpauthUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
    };
  }

  async verifyAndEnableTwoFactor(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication setup not initiated');
    }

    const isValid = TOTPUtil.verifyTOTP(user.twoFactorSecret, token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.twoFact === 1) {
      // Already enabled, just verify
      return { message: 'verification success' };
    } else {
      // Enable 2FA
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFact: 1 },
      });

      return { message: 'Two-factor authentication enabled successfully' };
    }
  }

  async disableTwoFactor(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (user.twoFact !== 1) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor secret not found');
    }

    const isValid = TOTPUtil.verifyTOTP(user.twoFactorSecret, token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFact: 0,
        twoFactorSecret: null,
      },
    });

    return { message: 'Two-factor authentication disabled successfully' };
  }

  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.twoFact !== 1 || !user.twoFactorSecret) {
      return false;
    }

    return TOTPUtil.verifyTOTP(user.twoFactorSecret, token);
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!fcmToken) throw new BadRequestException('FCM token required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken } as any,
    });

    return { message: 'FCM token updated successfully' };
  }

  async updateWalletAddress(userId: string, walletAddress: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!walletAddress?.trim()) throw new BadRequestException('Wallet address is required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { walletAddress: walletAddress.trim() },
    });

    return { message: 'Wallet address updated successfully' };
  }

  async getReferPoints(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referPoints: true },
    });
    if (!user) throw new BadRequestException('User not found');
    return { referPoints: user.referPoints ?? 0 };
  }

  async getTotalPlatformPointsSummary(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');

    const [user, stats] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { totalPlatformPoints: true, referPoints: true },
      }),
      this.prisma.userBattleStats.findUnique({
        where: { userId },
        select: { totalBattlePoints: true },
      }),
    ]);

    if (!user) throw new BadRequestException('User not found');

    const totalPlatformPoints = user.totalPlatformPoints ?? 0;
    const referPoints = user.referPoints ?? 0;
    const totalBattlePoints = stats?.totalBattlePoints ?? 0;

    return {
      totalPlatformPoints,
      totalBattlePoints,
      referPoints,
      used: totalBattlePoints + referPoints - totalPlatformPoints,
    };
  }
}
