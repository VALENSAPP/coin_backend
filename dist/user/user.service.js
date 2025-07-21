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
const AWS = require("aws-sdk");
const uuid_1 = require("uuid");
const path = require("path");
const sgMail = require("@sendgrid/mail");
let UserService = class UserService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async register(data) {
        if (data.email && await this.prisma.user.findUnique({ where: { email: data.email } })) {
            throw new common_1.BadRequestException('Email already registered');
        }
        if (data.googleId && await this.prisma.user.findUnique({ where: { googleId: data.googleId } })) {
            throw new common_1.BadRequestException('Google account already registered');
        }
        if (data.twitterId && await this.prisma.user.findUnique({ where: { twitterId: data.twitterId } })) {
            throw new common_1.BadRequestException('Twitter account already registered');
        }
        if (data.walletAddress && await this.prisma.user.findUnique({ where: { walletAddress: data.walletAddress } })) {
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
        return user;
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
    async uploadImageToS3(file) {
        const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });
        const fileExt = path.extname(file.originalname);
        const key = `profile-images/${(0, uuid_1.v4)()}${fileExt}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
        };
        await s3.putObject(params).promise();
        return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }
    async editProfile(userId, dto, image) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        let imageUrl = undefined;
        if (image) {
            imageUrl = await this.uploadImageToS3(image);
        }
        const data = {};
        if (dto.phoneNumber !== undefined)
            data.phoneNumber = dto.phoneNumber;
        if (dto.gender !== undefined)
            data.gender = dto.gender;
        if (dto.age !== undefined)
            data.age = dto.age;
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
        if (!user || !user.otp || !user.otpExpiresAt)
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
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);
//# sourceMappingURL=user.service.js.map