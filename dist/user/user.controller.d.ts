import { UserService } from './user.service';
import { Request } from 'express';
import { FollowPersonDto, UnfollowDto, BlockUserDto, UnblockUserDto } from './dto/follow.dto';
export declare enum RegistrationType {
    NORMAL = "NORMAL",
    GOOGLE = "GOOGLE",
    TWITTER = "TWITTER",
    WALLET = "WALLET"
}
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
export declare class RegisterDto {
    email?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
}
export declare class LoginDto {
    email?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
}
export declare class ProfileEditDto {
    userName?: string;
    displayName?: string;
    bio?: string;
    walletAddress?: string;
    phoneNumber?: string;
    gender?: Gender;
    image?: any;
    age?: number;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class VerifyOtpDto {
    email: string;
    otp: string;
}
export declare class SendEmailOtpDto {
    email: string;
}
export declare class VerifyEmailOtpDto {
    email: string;
    otp: string;
}
export declare class ResetPasswordDto {
    email: string;
    otp: string;
    newPassword: string;
}
export declare class CheckDisplayNameDto {
    displayName: string;
}
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    register(dto: RegisterDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
            access_token: string;
        };
    }>;
    getProfile(req: Request): Promise<{
        user: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    }>;
    editProfile(req: Request, dto: ProfileEditDto, image: Express.Multer.File): Promise<{
        message: string;
        user: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        message: string;
    }>;
    sendEmailOtp(dto: SendEmailOtpDto): Promise<{
        message: string;
    }>;
    verifyEmailOtp(dto: VerifyEmailOtpDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    followPerson(req: Request, dto: FollowPersonDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        followingId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
    }>;
    unfollow(req: Request, dto: UnfollowDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        followingId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
    }>;
    blockUser(req: Request, dto: BlockUserDto): Promise<{
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    }>;
    unblockUser(req: Request, dto: UnblockUserDto): Promise<{
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    }>;
    getPendingFollowRequests(req: Request): Promise<never[]>;
    getFollowersList(userId: string): Promise<({
        follower: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        followingId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
    })[]>;
    getFollowingList(userId: string): Promise<({
        following: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        followingId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
    })[]>;
    getBlockedUsers(req: Request): Promise<({
        blocked: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    } & {
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    })[]>;
    getAllUsers(): Promise<{
        users: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        }[];
    }>;
    getDisplayNames(): Promise<{
        users: {
            id: string;
            email: string | null;
            userName: string | null;
            displayName: string | null;
        }[];
    }>;
    checkDisplayName(dto: CheckDisplayNameDto): Promise<{
        status: string;
        message: string;
        displayName: string;
        suggestions?: undefined;
    } | {
        status: string;
        message: string;
        displayName: string;
        suggestions: string[];
    }>;
    getUserById(id: string): Promise<{
        user: {
            id: string;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            deletedAt: Date | null;
            isDeleted: number;
            otp: string | null;
            otpExpiresAt: Date | null;
            verifyEmail: number;
        };
    }>;
    softDeleteUser(id: string): Promise<{
        message: string;
    }>;
}
