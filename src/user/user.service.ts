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
// Add AWS and nodemailer stubs
// import * as AWS from 'aws-sdk';
// import * as nodemailer from 'nodemailer';

export type RegistrationType = 'NORMAL' | 'GOOGLE' | 'TWITTER' | 'WALLET';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    email?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
  }) {
    // Special case: If all of twitterId, walletAddress, and googleId are present
    if (data.twitterId || data.walletAddress || data.googleId) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          twitterId: data.twitterId,
          walletAddress: data.walletAddress,
          googleId: data.googleId,
          deletedAt: null,
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
    if (
      data.email &&
      await this.prisma.user.findFirst({ where: { email: data.email, deletedAt: null } })
    ) {
      throw new BadRequestException('Email already registered');
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
    return user;
  }

  // Forgot password: generate OTP, save to user, send email (stub)
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Email not registered');
    const otp = randomBytes(3).toString('hex');
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: 'Your Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`,
    });
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
    const otp = randomBytes(3).toString('hex');
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

  // Get user by ID (exclude soft-deleted)
  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  // Get all users (exclude soft-deleted)
  async getAllUsers() {
    return this.prisma.user.findMany({ where: { deletedAt: null } });
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
      include: { following: true },
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
      message: 'Display name is already taken by User',
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
} 