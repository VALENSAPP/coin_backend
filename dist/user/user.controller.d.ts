import { UserService } from './user.service';
import { Request } from 'express';
import { FollowPersonDto, UnfollowDto, BlockUserDto, UnblockUserDto } from './dto/follow.dto';
import { RecentActivitiesDto } from './dto/recent-activities.dto';
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
    userName?: string;
    profile?: string;
    password?: string;
    googleId?: string;
    appleId?: string;
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
export declare class ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}
export declare class CheckDisplayNameDto {
    displayName: string;
}
export declare class GetProfileDto {
    userId: string;
}
export declare class GetUserDashboardDto {
    userId: string;
}
export declare class GetAllUsersDto {
    email?: string;
    userName?: string;
    googleId?: string;
    twitterId?: string;
    phoneNumber?: string;
}
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    register(dto: RegisterDto): Promise<{
        id: string;
        firebaseUserId: string | null;
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        appleId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        createdAt: Date;
        updatedAt: Date;
        age: number | null;
        deletedAt: Date | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        otp: string | null;
        otpExpiresAt: Date | null;
        phoneNumber: string | null;
        isDeleted: number;
        verifyEmail: number;
        bio: string | null;
        displayName: string | null;
        userName: string | null;
        profile: string | null;
        walletMnemonic: string | null;
        walletPrivateKey: string | null;
        currentPeriodEnd: Date | null;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        subscriptionEnd: Date | null;
        subscriptionStart: Date | null;
        subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
        tokenBalance: number;
        kyc: boolean;
        stripeAccountId: string | null;
        stripeBankAccountId: string | null;
        refreshToken: string | null;
        refreshTokenExpiresAt: Date | null;
        access_token: string;
        refresh_token: string;
        error?: undefined;
        msg?: undefined;
        body?: undefined;
    } | {
        error: boolean;
        msg: any;
        body: any[];
    } | {
        access_token: string;
        user: {
            id: string;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            age: number | null;
            deletedAt: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            otp: string | null;
            otpExpiresAt: Date | null;
            phoneNumber: string | null;
            isDeleted: number;
            verifyEmail: number;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
            profile: string | null;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            kyc: boolean;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
        };
    }>;
    getProfile(req: Request, query: GetProfileDto): Promise<{
        isFollow: boolean;
        id: string;
        firebaseUserId: string | null;
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        appleId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        createdAt: Date;
        updatedAt: Date;
        age: number | null;
        deletedAt: Date | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        otp: string | null;
        otpExpiresAt: Date | null;
        phoneNumber: string | null;
        isDeleted: number;
        verifyEmail: number;
        bio: string | null;
        displayName: string | null;
        userName: string | null;
        profile: string | null;
        walletMnemonic: string | null;
        walletPrivateKey: string | null;
        currentPeriodEnd: Date | null;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        subscriptionEnd: Date | null;
        subscriptionStart: Date | null;
        subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
        tokenBalance: number;
        kyc: boolean;
        stripeAccountId: string | null;
        stripeBankAccountId: string | null;
        refreshToken: string | null;
        refreshTokenExpiresAt: Date | null;
    }>;
    editProfile(req: Request, dto: ProfileEditDto, image: Express.Multer.File): Promise<{
        message: string;
        user: {
            totalPosts: number;
            totalFollowing: number;
            totalFollowers: number;
            id: string;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            age: number | null;
            deletedAt: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            otp: string | null;
            otpExpiresAt: Date | null;
            phoneNumber: string | null;
            isDeleted: number;
            verifyEmail: number;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
            profile: string | null;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            kyc: boolean;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
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
    changePassword(req: Request, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    followPerson(req: Request, dto: FollowPersonDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        followingId: string;
    }>;
    unfollow(req: Request, dto: UnfollowDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        followingId: string;
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
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            age: number | null;
            deletedAt: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            otp: string | null;
            otpExpiresAt: Date | null;
            phoneNumber: string | null;
            isDeleted: number;
            verifyEmail: number;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
            profile: string | null;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            kyc: boolean;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        followingId: string;
    })[]>;
    getFollowingList(userId: string): Promise<({
        following: {
            userTokens: {
                tokenAddress: string | null;
            }[];
        } & {
            id: string;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            age: number | null;
            deletedAt: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            otp: string | null;
            otpExpiresAt: Date | null;
            phoneNumber: string | null;
            isDeleted: number;
            verifyEmail: number;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
            profile: string | null;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            kyc: boolean;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        followingId: string;
    })[]>;
    getBlockedUsers(req: Request): Promise<({
        blocked: {
            id: string;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            age: number | null;
            deletedAt: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            otp: string | null;
            otpExpiresAt: Date | null;
            phoneNumber: string | null;
            isDeleted: number;
            verifyEmail: number;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
            profile: string | null;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            kyc: boolean;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    })[]>;
    getAllUsers(query: GetAllUsersDto): Promise<{
        users: {
            id: string;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            age: number | null;
            deletedAt: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            otp: string | null;
            otpExpiresAt: Date | null;
            phoneNumber: string | null;
            isDeleted: number;
            verifyEmail: number;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
            profile: string | null;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            kyc: boolean;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
        }[];
    }>;
    getDisplayNames(): Promise<{
        users: {
            id: string;
            email: string | null;
            displayName: string | null;
            userName: string | null;
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
    getUserDashboard(query: GetUserDashboardDto): Promise<{
        dashboardData: {
            totalPosts: number;
            totalFollowing: number;
            totalFollowers: number;
        };
    }>;
    searchUser(query: string): Promise<{
        users: {
            id: string;
            email: string | null;
            image: string | null;
            displayName: string | null;
            userName: string | null;
        }[];
    }>;
    getRecentActivities(req: Request, query: RecentActivitiesDto): Promise<{
        activities: any;
    }>;
    getSuggestedUsers(req: Request, limit?: string): Promise<{
        suggestedUsers: {
            id: string;
            image: string | null;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
        }[];
    }>;
    getHitLeft(req: Request): Promise<{
        hitLeft: number;
    }>;
    getUserById(id: string): Promise<{
        user: {
            id: string;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            createdAt: Date;
            updatedAt: Date;
            age: number | null;
            deletedAt: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            otp: string | null;
            otpExpiresAt: Date | null;
            phoneNumber: string | null;
            isDeleted: number;
            verifyEmail: number;
            bio: string | null;
            displayName: string | null;
            userName: string | null;
            profile: string | null;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            kyc: boolean;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
        };
    }>;
    softDeleteUser(id: string): Promise<{
        message: string;
    }>;
}
