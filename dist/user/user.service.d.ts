import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
export type RegistrationType = 'NORMAL' | 'GOOGLE' | 'TWITTER' | 'WALLET';
export declare class UserService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(data: {
        email?: string;
        password?: string;
        googleId?: string;
        twitterId?: string;
        walletAddress?: string;
        registrationType: RegistrationType;
    }): Promise<{
        access_token: string;
        user: {
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isDeleted: number;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    }>;
    validateUser(data: {
        email?: string;
        password?: string;
        googleId?: string;
        twitterId?: string;
        walletAddress?: string;
        registrationType: RegistrationType;
    }): Promise<{
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        phoneNumber: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        age: number | null;
        otp: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isDeleted: number;
        otpExpiresAt: Date | null;
        verifyEmail: number;
    }>;
    editProfile(userId: string, dto: any, image?: Express.Multer.File): Promise<{
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        phoneNumber: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        age: number | null;
        otp: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isDeleted: number;
        otpExpiresAt: Date | null;
        verifyEmail: number;
    }>;
    forgotPassword(email: string): Promise<boolean>;
    verifyOtp(email: string, otp: string): Promise<boolean>;
    sendEmailOtp(email: string): Promise<boolean>;
    verifyEmailOtp(email: string, otp: string): Promise<boolean>;
    resetPassword(email: string, otp: string, newPassword: string): Promise<boolean>;
    getUserById(id: string): Promise<{
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        phoneNumber: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        age: number | null;
        otp: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isDeleted: number;
        otpExpiresAt: Date | null;
        verifyEmail: number;
    }>;
    getAllUsers(): Promise<{
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        phoneNumber: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        age: number | null;
        otp: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isDeleted: number;
        otpExpiresAt: Date | null;
        verifyEmail: number;
    }[]>;
    softDeleteUser(id: string): Promise<boolean>;
    followPerson(followerId: string, followingId: string): Promise<{
        followerId: string;
        followingId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
    }>;
    acceptFollowRequest(followerId: string, followingId: string): Promise<{
        followerId: string;
        followingId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
    }>;
    getFollowersList(userId: string): Promise<({
        follower: {
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isDeleted: number;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    } & {
        followerId: string;
        followingId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
    })[]>;
    getFollowingList(userId: string): Promise<({
        following: {
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isDeleted: number;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    } & {
        followerId: string;
        followingId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
    })[]>;
    unfollow(followerId: string, followingId: string): Promise<{
        followerId: string;
        followingId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
    }>;
    getPendingFollowRequests(userId: string): Promise<({
        follower: {
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isDeleted: number;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    } & {
        followerId: string;
        followingId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
    })[]>;
    cancelFollowRequest(followerId: string, followingId: string): Promise<{
        followerId: string;
        followingId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
    }>;
    blockUser(blockerId: string, blockedId: string): Promise<{
        blockerId: string;
        blockedId: string;
        id: string;
        createdAt: Date;
    }>;
    unblockUser(blockerId: string, blockedId: string): Promise<{
        blockerId: string;
        blockedId: string;
        id: string;
        createdAt: Date;
    }>;
    getBlockedUsers(blockerId: string): Promise<({
        blocked: {
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isDeleted: number;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    } & {
        blockerId: string;
        blockedId: string;
        id: string;
        createdAt: Date;
    })[]>;
}
