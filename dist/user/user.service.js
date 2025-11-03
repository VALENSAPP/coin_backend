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
const uuid_1 = require("uuid");
const path = require("path");
const sgMail = require("@sendgrid/mail");
const jwt_1 = require("@nestjs/jwt");
const s3_util_1 = require("../common/s3.util");
const wallet_util_1 = require("../common/wallet.util");
const crypto_util_1 = require("../common/crypto.util");
const admin = require("firebase-admin");
const serviceAccountPath = path.join(process.cwd(), 'config', 'service-account-key.json');
if (!admin.apps.length) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        databaseURL: 'https://nexgenfren.firebaseio.com',
    });
    console.log('🔥 Firebase Admin initialized successfully');
}
let UserService = class UserService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(data) {
        if (data.googleId) {
            return this.signInWithGoogle(data.googleId);
        }
        if (data.registrationType === 'NORMAL' && (!data.userName || data.userName.trim() === '')) {
            throw new common_1.BadRequestException('Username is required');
        }
        if (data.twitterId || data.walletAddress || data.googleId) {
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    twitterId: data.twitterId,
                    walletAddress: data.walletAddress,
                    googleId: data.googleId,
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
        }
        if (data.email) {
            const existingUser = await this.prisma.user.findFirst({
                where: { email: data.email, userName: data.userName },
            });
            if (existingUser) {
                if (existingUser.deletedAt === null) {
                    throw new common_1.BadRequestException('Email already registered');
                }
                else {
                    throw new common_1.BadRequestException('Email previously registered. Please contact support for account recovery.');
                }
            }
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
        if (data.userName) {
            const existingUserName = await this.prisma.user.findFirst({
                where: { userName: data.userName, deletedAt: null }
            });
            if (existingUserName) {
                throw new common_1.BadRequestException('Username already taken');
            }
        }
        let passwordHash = undefined;
        if (data.registrationType === 'NORMAL') {
            if (!data.email || !data.password)
                throw new common_1.BadRequestException('Email and password required');
            passwordHash = await bcrypt.hash(data.password, 10);
        }
        const wallet = (0, wallet_util_1.generateWallet)();
        const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
        const encryptedPrivateKey = (0, crypto_util_1.encryptSecret)(wallet.privateKey, encryptionKey);
        const encryptedMnemonic = (0, crypto_util_1.encryptSecret)(wallet.mnemonic, encryptionKey);
        let user;
        try {
            const userData = {
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
        }
        catch (error) {
            if (error.code === 'P2002') {
                const field = error.meta?.target?.[0];
                if (field === 'email') {
                    throw new common_1.BadRequestException('Email already registered');
                }
                else if (field === 'walletAddress') {
                    throw new common_1.BadRequestException('Wallet address already registered');
                }
                else if (field === 'googleId') {
                    throw new common_1.BadRequestException('Google account already registered');
                }
                else if (field === 'twitterId') {
                    throw new common_1.BadRequestException('Twitter account already registered');
                }
                else {
                    throw new common_1.BadRequestException(`Unique constraint violation on field: ${field}`);
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
        const dashboardData = await this.getUserDashboard(userId);
        return { ...user, ...dashboardData };
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
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (!user.password)
            throw new common_1.BadRequestException('User does not have a password set');
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid)
            throw new common_1.BadRequestException('Old password is incorrect');
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: passwordHash },
        });
        return true;
    }
    async getUserById(id) {
        const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        return user;
    }
    async isFollowing(followerId, followingId) {
        if (!followerId || !followingId)
            return false;
        if (followerId === followingId)
            return false;
        const record = await this.prisma.followerAndFollowing.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });
        return !!record && record.status === 'ACCEPTED';
    }
    async getAllUsers(query) {
        const where = { deletedAt: null };
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
            message: 'Display name is already taken',
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
    async getUserDashboard(userId) {
        const totalPosts = await this.prisma.post.count({
            where: {
                userId: userId,
                deletedAt: null,
            },
        });
        const totalFollowing = await this.prisma.followerAndFollowing.count({
            where: {
                followerId: userId,
                status: 'ACCEPTED',
            },
        });
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
    async getHitLeft(userId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const postHit = await this.prisma.postHit.findFirst({
            where: { userId },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return postHit ? postHit.hitLeft : 0;
    }
    async searchUser(query) {
        if (!query)
            throw new common_1.BadRequestException('Search query required');
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
        return users;
    }
    async recentActivities(userId, type) {
        const result = {};
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
    async getSuggestedUsers(userId, limit = 10) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
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
        const mutualIds = [...new Set([...followingIds, ...followerIds])];
        if (mutualIds.length === 0) {
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
        const suggestedUsers = await this.prisma.followerAndFollowing.findMany({
            where: {
                followerId: { in: mutualIds },
                followingId: { not: userId },
                status: 'ACCEPTED',
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
        const users = suggestedUsers.map(s => s.following);
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
    async signInWithGoogle(idToken) {
        try {
            if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
                return {
                    error: true,
                    msg: 'Invalid ID token provided',
                    body: [],
                };
            }
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const email = decodedToken.email;
            const provider = decodedToken.firebase?.sign_in_provider;
            let loginType = 'GOOGLE';
            if (email && email.endsWith('.ac.jp')) {
                loginType = 'NORMAL';
            }
            const existingUser = await this.prisma.user.findFirst({
                where: { email },
            });
            if (existingUser) {
                if (existingUser.isDeleted === 1) {
                    throw new common_1.BadRequestException('Account is deleted by admin');
                }
                if (provider === 'password' && existingUser.verifyEmail !== 1) {
                    throw new common_1.BadRequestException('Please verify your email before signing in.');
                }
                const token = this.jwtService.sign({
                    userId: existingUser.id,
                    email: existingUser.email,
                    user_name: existingUser.userName,
                }, { expiresIn: '1d' });
                const refreshToken = this.jwtService.sign({
                    userId: existingUser.id,
                    email: existingUser.email,
                    user_name: existingUser.userName,
                }, { expiresIn: '5d' });
                const refreshTokenHash = (0, crypto_1.randomBytes)(32).toString('hex');
                const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
                await this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        refreshToken: refreshTokenHash,
                        refreshTokenExpiresAt,
                    },
                });
                return {
                    access_token: token,
                    refresh_token: refreshTokenHash,
                    ...existingUser
                };
            }
            else {
                const firebaseUserId = decodedToken.uid;
                const userId = (0, uuid_1.v4)();
                const userData = {
                    id: userId,
                    firebaseUserId,
                    email,
                    userName: decodedToken.name || 'Unknown User',
                    profile: decodedToken.picture || null,
                    googleId: provider === 'google.com' ? firebaseUserId : null,
                    registrationType: loginType,
                    verifyEmail: 1,
                };
                const newUser = await this.prisma.user.create({
                    data: userData,
                });
                const token = this.jwtService.sign({
                    userId: newUser.id,
                    email: newUser.email,
                    user_name: newUser.userName,
                }, { expiresIn: '1d' });
                const refreshToken = this.jwtService.sign({
                    userId: newUser.id,
                    email: newUser.email,
                    user_name: newUser.userName,
                }, { expiresIn: '5d' });
                const refreshTokenHash = (0, crypto_1.randomBytes)(32).toString('hex');
                const refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
                await this.prisma.user.update({
                    where: { id: newUser.id },
                    data: {
                        refreshToken: refreshTokenHash,
                        refreshTokenExpiresAt,
                    },
                });
                return {
                    access_token: token,
                    refresh_token: refreshTokenHash,
                    ...newUser
                };
            }
        }
        catch (error) {
            console.error('Firebase auth error:', error);
            return {
                error: true,
                msg: error.message || 'Token verification failed',
                body: [error],
            };
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserService);
//# sourceMappingURL=user.service.js.map