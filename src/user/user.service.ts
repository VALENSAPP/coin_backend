import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Gender } from './user.controller';
import { randomBytes } from 'crypto';
import { Express } from 'express';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as sgMail from '@sendgrid/mail';
import { JwtService } from '@nestjs/jwt';
import { uploadImageToS3 } from '../common/s3.util';
import { generateWallet } from '../common/wallet.util';
import { encryptSecret } from '../common/crypto.util';
// import admin from '../auth/firebase.config';
// import admin from '../auth/firebase.config';
import * as admin from 'firebase-admin';
import axios from 'axios';

// ✅ Use absolute path to service account
const serviceAccountPath = path.join(process.cwd(), 'config', 'service-account-key.json');

// Prevent re-initializing Firebase if already initialized
if (!admin.apps.length) {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
    databaseURL: 'https://nexgenfren.firebaseio.com',
  });

  console.log('🔥 Firebase Admin initialized successfully');
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
  ) {}

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
  }) {
    // Check if this is a Firebase Google registration request
    // if (data.idToken && data.registrationType === 'GOOGLE') {
    if (data.googleId) {
      return this.signInWithGoogle(data.googleId);
    }

    if (data.appleId) {
      return this.signInWithApple(data.appleId);
    }

     if (data.twitterId) {
      return this.twitterLogin(data.twitterId);
    }
    // Validate username is required for NORMAL registration
    if (data.registrationType === 'NORMAL' && (!data.userName || data.userName.trim() === '')) {
      throw new BadRequestException('Username is required');
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
        const payload = { sub: existingUser.id, email: existingUser.email, registrationType: existingUser.registrationType };
        return {
          access_token: this.jwtService.sign(payload),
          user: existingUser,
        };
      }
      // If not found, proceed to registration as usual
    }
    // Check for existing user by unique fields (exclude soft-deleted)
    if (data.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: data.email, userName: data.userName },
      });
      if (existingUser) {
        if (existingUser.deletedAt === null) {
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
      throw new BadRequestException('Google account already registered');
    }
    if (
      data.twitterId &&
      await this.prisma.user.findFirst({ where: { twitterId: data.twitterId, deletedAt: null } })
    ) {
      throw new BadRequestException('Twitter account already registered');
    }
    if (
      data.walletAddress &&
      await this.prisma.user.findFirst({ where: { walletAddress: data.walletAddress, deletedAt: null } })
    ) {
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
    let passwordHash = undefined;
    if (data.registrationType === 'NORMAL') {
      if (!data.email || !data.password) throw new BadRequestException('Email and password required');
      passwordHash = await bcrypt.hash(data.password, 10);
    }
    // Auto-create wallet for every user on signup
    const wallet = generateWallet();
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
    const encryptedPrivateKey = encryptSecret(wallet.privateKey, encryptionKey);
    const encryptedMnemonic = encryptSecret(wallet.mnemonic, encryptionKey);

    let user;
    try {
      const userData: any = {
        email: data.email,
        password: passwordHash,
        googleId: data.googleId,
        twitterId: data.twitterId,
        walletAddress: wallet.address,
        walletPrivateKey: encryptedPrivateKey,
        walletMnemonic: encryptedMnemonic,
        registrationType: data.registrationType,
      };
      if (data.userName) {
        userData.userName = data.userName;
      }
      if (data.profile) {
        userData.profile = data.profile;
      }
      user = await this.prisma.user.create({
        data: userData,
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

    const payload = { sub: user.id, email: user.email, registrationType: user.registrationType };
    return {
      access_token: this.jwtService.sign(payload),
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
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: 'Your Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}`,
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
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: 'Your Email Verification OTP',
      text: `Your OTP is: ${otp}`,
    });
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

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.otp || !user.otpExpiresAt) throw new BadRequestException('OTP not found');
    if (user.otp !== otp) throw new BadRequestException('Invalid OTP');
    if (user.otpExpiresAt < new Date()) throw new BadRequestException('OTP expired');
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
    return user;
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

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    return this.prisma.user.findMany({ where });
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
    return this.prisma.followerAndFollowing.create({
      data: { followerId, followingId, status: 'ACCEPTED' },
    });
  }

  async getFollowersList(userId: string) {
    return this.prisma.followerAndFollowing.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      include: { follower: true },
    });
  }

  async getFollowingList(userId: string) {
    return this.prisma.followerAndFollowing.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      include: {
        following: {
          include: {
            userTokens: {
              select: {
                tokenAddress: true
              }
            }
          }
        }
      },
    });
  }

  async unfollow(followerId: string, followingId: string) {
    if (!followingId) throw new BadRequestException('Following ID is required');
    const existing = await this.prisma.followerAndFollowing.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing || existing.status !== 'ACCEPTED') throw new BadRequestException('Not following this user');
    return this.prisma.followerAndFollowing.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
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
    const postHit = await this.prisma.postHit.findFirst({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return postHit ? postHit.hitLeft : 0;
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

    if (!type || type === 'purchase') {
      const purchases = await this.prisma.tokenPurchase.findMany({
        where: { vendorId: userId },
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      result.purchase = purchases.map(p => ({
        vendorId: p.vendorId,
        userId: p.userId,
        username: p.user.displayName,
        tokensReceived: p.tokensReceived,
        createdAt: p.createdAt,
      }));
    }

    if (!type || type === 'sell') {
      const sales = await this.prisma.tokenSale.findMany({
        where: { vendorId: userId },
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      result.sell = sales.map(s => ({
        vendorId: s.vendorId,
        userId: s.userId,
        username: s.user.displayName,
        amountTokens: s.amountTokens,
        createdAt: s.createdAt,
      }));
    }

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

           async twitterLogin(accessToken: string) {
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
      const email = twitterUser.email || null;
      const userName = twitterUser.name || twitterUser.username;
      const profile = twitterUser.profile_image_url || null;

      // Check if user already exists
      let existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { twitterId },
            email ? { email } : undefined,
          ].filter(Boolean) as any,
        },
      });

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
      }

      // Generate tokens
      const payload = {
        sub: existingUser.id,
        email: existingUser.email,
        registrationType: existingUser.registrationType,
      };
      const access_token = this.jwtService.sign(payload);

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
        access_token,
        refresh_token: refreshTokenHash,
        ...existingUser,
      };
    } catch (error) {
      console.error('Twitter login error:', error.response?.data || error.message);
      throw new BadRequestException('Twitter login failed');
    }
  }
}
