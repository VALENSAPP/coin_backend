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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../user/user.service");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const firebase_config_1 = require("./firebase.config");
let AuthService = class AuthService {
    userService;
    jwtService;
    prisma;
    constructor(userService, jwtService, prisma) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    async validateUser(loginDto) {
        return this.userService.validateUser(loginDto);
    }
    async login(loginDto) {
        if (loginDto.idToken) {
            return this.signInWithGoogle(loginDto.idToken);
        }
        const user = await this.validateUser(loginDto);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const payload = { sub: user.id, email: user.email, registrationType: user.registrationType };
        const access_token = this.jwtService.sign(payload);
        const refreshToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
    async getProfile(userId) {
        const user = await this.userService.getUserById(userId);
        return {
            message: 'Profile fetched successfully',
            user
        };
    }
    async refreshToken(refreshToken) {
        const user = await this.prisma.user.findFirst({
            where: {
                refreshToken,
                refreshTokenExpiresAt: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const payload = { sub: user.id, email: user.email, registrationType: user.registrationType };
        const access_token = this.jwtService.sign(payload);
        const newRefreshToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const newRefreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
    async signInWithGoogle(idToken) {
        try {
            if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
                return {
                    error: true,
                    msg: 'Invalid ID token provided',
                    body: [],
                };
            }
            const decodedToken = await firebase_config_1.default.auth().verifyIdToken(idToken);
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
                    id: existingUser.id,
                    email: existingUser.email,
                    user_name: existingUser.userName,
                }, { expiresIn: '1d' });
                const refreshToken = this.jwtService.sign({
                    id: existingUser.id,
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
                    id: newUser.id,
                    email: newUser.email,
                    user_name: newUser.userName,
                }, { expiresIn: '1d' });
                const refreshToken = this.jwtService.sign({
                    id: newUser.id,
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
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map