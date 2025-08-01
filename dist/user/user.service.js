"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const sgMail = require("@sendgrid/mail");
const jwt_1 = require("@nestjs/jwt");
const s3_util_1 = require("../common/s3.util");
let UserService = class UserService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(data) {
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
        }
        if (data.email &&
            await this.prisma.user.findFirst({ where: { email: data.email, deletedAt: null } })) {
            throw new common_1.BadRequestException('Email already registered');
        }
        if (data.googleId &&
            await this.prisma.user.findFirst({ where: { googleId: data.googleId, deletedAt: null } })) {
            throw new common_1.BadRequestException('Google account already registered');
        }
        if (data.twitterId &&
            await this.prisma.user.findFirst({ where: { twitterId: data.twitterId, deletedAt: null } })) {
            throw new common_1.BadRequestException('Twitter account already registered');
        }
        if (data.walletAddress &&
            await this.prisma.user.findFirst({ where: { walletAddress: data.walletAddress, deletedAt: null } })) {
            throw new common_1.BadRequestException('Wallet address already registered');
        }
        let passwordHash = undefined;
        if (data.registrationType === 'NORMAL') {
            if (!data.email || !data.password)
                throw new common_1.BadRequestException('Email and password required');
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
    async validateUser(data) {
        let user = null;
        if (data.registrationType === 'NORMAL') {
            if (!data.email || !data.password)
                throw new common_1.BadRequestException('Email and password required');
            user = await this.prisma.user.findUnique({ where: { email: data.email } });
            if (!user || !user.password || !(await bcrypt.compare(data.password, user.password))) {
                throw new common_1.BadRequestException('Invalid credentials');
            }
        }
        else if (data.registrationType === 'GOOGLE' && data.googleId) {
            user = await this.prisma.user.findUnique({ where: { googleId: data.googleId } });
            if (!user)
                throw new common_1.BadRequestException('Google account not registered');
        }
        else if (data.registrationType === 'TWITTER' && data.twitterId) {
            user = await this.prisma.user.findUnique({ where: { twitterId: data.twitterId } });
            if (!user)
                throw new common_1.BadRequestException('Twitter account not registered');
        }
        else if (data.registrationType === 'WALLET' && data.walletAddress) {
            user = await this.prisma.user.findUnique({ where: { walletAddress: data.walletAddress } });
            if (!user)
                throw new common_1.BadRequestException('Wallet address not registered');
        }
        else {
            throw new common_1.BadRequestException('Invalid login type or missing credentials');
        }
        return user;
    }
    async editProfile(userId, dto, image) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        console.log('EditProfile DTO received:', dto);
        const currentUser = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!currentUser)
            throw new common_1.BadRequestException('User not found');
        console.log('Current user wallet address:', currentUser.walletAddress);
        console.log('Wallet validation:', {
            dtoWalletAddress: dto.walletAddress,
            currentUserWalletAddress: currentUser.walletAddress,
            hasWalletAddress: dto.walletAddress !== undefined && dto.walletAddress !== '' && dto.walletAddress !== null,
            hasExistingWallet: !!currentUser.walletAddress
        });
        if (dto.walletAddress !== undefined && dto.walletAddress !== '' && dto.walletAddress !== null && currentUser.walletAddress) {
            console.log('Throwing wallet address error');
            throw new common_1.BadRequestException('Wallet address already exists. Please contact admin for wallet address changes.');
        }
        let imageUrl = undefined;
        if (image) {
            imageUrl = await (0, s3_util_1.uploadImageToS3)(image, 'profile-images');
        }
        const data = {};
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
        if (dto.phoneNumber !== undefined && dto.phoneNumber !== '' && dto.phoneNumber !== null) {
            data.phoneNumber = dto.phoneNumber;
        }
        if (dto.gender !== undefined && dto.gender !== '' && dto.gender !== null) {
            const validGenders = ['MALE', 'FEMALE', 'OTHER'];
            if (validGenders.includes(dto.gender)) {
                data.gender = dto.gender;
            }
            else {
                throw new common_1.BadRequestException('Invalid gender value. Must be MALE, FEMALE, or OTHER');
            }
        }
        if (dto.age !== undefined && dto.age !== '' && dto.age !== null) {
            data.age = Number(dto.age);
        }
        if (imageUrl)
            data.image = imageUrl;
        const user = await this.prisma.user.update({
            where: { id: userId },
            data,
        });
        return user;
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException('Email not registered');
        const otp = (0, crypto_1.randomBytes)(3).toString('hex');
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.user.update({
            where: { email },
            data: { otp, otpExpiresAt },
        });
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Your Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}`,
        });
        return true;
    }
    async verifyOtp(email, otp) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.otp || !user.otpExpiresAt)
            throw new common_1.BadRequestException('OTP not found');
        if (user.otp !== otp)
            throw new common_1.BadRequestException('Invalid OTP');
        if (user.otpExpiresAt < new Date())
            throw new common_1.BadRequestException('OTP expired');
        await this.prisma.user.update({
            where: { email },
            data: { otp: null, otpExpiresAt: null },
        });
        return true;
    }
    async sendEmailOtp(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException('Email not registered');
        const otp = (0, crypto_1.randomBytes)(3).toString('hex');
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.user.update({
            where: { email },
            data: { otp, otpExpiresAt },
        });
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Your Email Verification OTP',
            text: `Your OTP is: ${otp}`,
        });
        return true;
    }
    async verifyEmailOtp(email, otp) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        const masterOtp = process.env.MASTER_OTP || "123456";
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (otp === masterOtp) {
            await this.prisma.user.update({
                where: { email },
                data: { otp: null, otpExpiresAt: null, verifyEmail: 1 },
            });
            return true;
        }
        if (!user.otp || !user.otpExpiresAt)
            throw new common_1.BadRequestException('OTP not found');
        if (user.otp !== otp)
            throw new common_1.BadRequestException('Invalid OTP');
        if (user.otpExpiresAt < new Date())
            throw new common_1.BadRequestException('OTP expired');
        await this.prisma.user.update({
            where: { email },
            data: { otp: null, otpExpiresAt: null, verifyEmail: 1 },
        });
        return true;
    }
    async resetPassword(email, otp, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.otp || !user.otpExpiresAt)
            throw new common_1.BadRequestException('OTP not found');
        if (user.otp !== otp)
            throw new common_1.BadRequestException('Invalid OTP');
        if (user.otpExpiresAt < new Date())
            throw new common_1.BadRequestException('OTP expired');
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { email },
            data: { password: passwordHash, otp: null, otpExpiresAt: null },
        });
        return true;
    }
    async getUserById(id) {
        const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        return user;
    }
    async getAllUsers() {
        return this.prisma.user.findMany({ where: { deletedAt: null } });
    }
    async softDeleteUser(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
        return true;
    }
    async followPerson(followerId, followingId) {
        if (!followingId)
            throw new common_1.BadRequestException('Following ID is required');
        if (followerId === followingId)
            throw new common_1.BadRequestException('Cannot follow yourself');
        const existing = await this.prisma.followerAndFollowing.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });
        if (existing)
            throw new common_1.BadRequestException('Already following this user');
        return this.prisma.followerAndFollowing.create({
            data: { followerId, followingId, status: 'ACCEPTED' },
        });
    }
    async getFollowersList(userId) {
        return this.prisma.followerAndFollowing.findMany({
            where: { followingId: userId, status: 'ACCEPTED' },
            include: { follower: true },
        });
    }
    async getFollowingList(userId) {
        return this.prisma.followerAndFollowing.findMany({
            where: { followerId: userId, status: 'ACCEPTED' },
            include: { following: true },
        });
    }
    async unfollow(followerId, followingId) {
        if (!followingId)
            throw new common_1.BadRequestException('Following ID is required');
        const existing = await this.prisma.followerAndFollowing.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });
        if (!existing || existing.status !== 'ACCEPTED')
            throw new common_1.BadRequestException('Not following this user');
        return this.prisma.followerAndFollowing.delete({
            where: { followerId_followingId: { followerId, followingId } },
        });
    }
    async getPendingFollowRequests(userId) {
        return [];
    }
    async blockUser(blockerId, blockedId) {
        if (!blockedId)
            throw new common_1.BadRequestException('Blocked ID is required');
        if (blockerId === blockedId)
            throw new common_1.BadRequestException('Cannot block yourself');
        const existing = await this.prisma.blockedUser.findUnique({
            where: { blockerId_blockedId: { blockerId, blockedId } },
        });
        if (existing)
            throw new common_1.BadRequestException('User already blocked');
        return this.prisma.blockedUser.create({
            data: { blockerId, blockedId },
        });
    }
    async unblockUser(blockerId, blockedId) {
        if (!blockedId)
            throw new common_1.BadRequestException('Blocked ID is required');
        const existing = await this.prisma.blockedUser.findUnique({
            where: { blockerId_blockedId: { blockerId, blockedId } },
        });
        if (!existing)
            throw new common_1.BadRequestException('User is not blocked');
        return this.prisma.blockedUser.delete({
            where: { blockerId_blockedId: { blockerId, blockedId } },
        });
    }
    async getBlockedUsers(blockerId) {
        return this.prisma.blockedUser.findMany({
            where: { blockerId },
            include: { blocked: true },
        });
    }
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
    async checkDisplayNameAvailability(displayName) {
        if (!displayName || displayName.trim() === '') {
            throw new common_1.BadRequestException('Display name is required');
        }
        const trimmedDisplayName = displayName.trim();
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
        const suggestions = await this.generateDisplayNameSuggestions(trimmedDisplayName);
        return {
            status: 'taken',
            message: 'Display name is already taken by user',
            displayName: trimmedDisplayName,
            suggestions: suggestions
        };
    }
    async generateDisplayNameSuggestions(baseName) {
        const suggestions = [];
        const baseNameLower = baseName.toLowerCase();
        const existingDisplayNames = await this.prisma.user.findMany({
            where: { deletedAt: null },
            select: { displayName: true },
        });
        const existingNames = new Set(existingDisplayNames.map(u => u.displayName?.toLowerCase()));
        for (let i = 1; i <= 999; i++) {
            const suggestion = `${baseName}${i}`;
            if (!existingNames.has(suggestion.toLowerCase())) {
                suggestions.push(suggestion);
                if (suggestions.length >= 4)
                    break;
            }
        }
        if (suggestions.length < 4) {
            for (let i = 1; i <= 999; i++) {
                const suggestion = `${baseName}_${i}`;
                if (!existingNames.has(suggestion.toLowerCase())) {
                    suggestions.push(suggestion);
                    if (suggestions.length >= 4)
                        break;
                }
            }
        }
        if (suggestions.length < 4) {
            for (let i = 1; i <= 999; i++) {
                const suggestion = `${baseName}.${i}`;
                if (!existingNames.has(suggestion.toLowerCase())) {
                    suggestions.push(suggestion);
                    if (suggestions.length >= 4)
                        break;
                }
            }
        }
        if (suggestions.length < 4) {
            const suffixes = ['x', 'pro', 'official', 'real', 'new', 'live', 'now', 'here'];
            for (const suffix of suffixes) {
                const suggestion = `${baseName}${suffix}`;
                if (!existingNames.has(suggestion.toLowerCase())) {
                    suggestions.push(suggestion);
                    if (suggestions.length >= 4)
                        break;
                }
            }
        }
        return suggestions.slice(0, 4);
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserService);
//# sourceMappingURL=user.service.js.map