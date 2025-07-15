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
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);
//# sourceMappingURL=user.service.js.map