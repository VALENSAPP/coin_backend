import { UserService } from './user.service';
import { Request } from 'express';
import { FollowPersonDto, UnfollowDto, BlockUserDto, UnblockUserDto } from './dto/follow.dto';
import { RecentActivitiesDto } from './dto/recent-activities.dto';
import { CreateUserSubscriptionDto, UpdateUserSubscriptionDto } from './dto/user-subscription.dto';
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
export declare class ProfileStatusSetDto {
    profileStatus: string;
}
export declare class ReactivateAccountDto {
    email?: string;
    googleId?: string;
    twitterId?: string;
    appleId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
}
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    register(dto: RegisterDto): Promise<{
        error: boolean;
        msg: any;
        body: any[];
    } | {
        kyc: boolean;
        email: string | null;
        userName: string | null;
        profile: string | null;
        password: string | null;
        googleId: string | null;
        appleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        displayName: string | null;
        bio: string | null;
        phoneNumber: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        age: number | null;
        otp: string | null;
        profileStatus: string;
        id: string;
        firebaseUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        otpExpiresAt: Date | null;
        isDeleted: number;
        verifyEmail: number;
        walletMnemonic: string | null;
        walletPrivateKey: string | null;
        currentPeriodEnd: Date | null;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        subscriptionEnd: Date | null;
        subscriptionStart: Date | null;
        subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
        tokenBalance: number;
        stripeAccountId: string | null;
        stripeBankAccountId: string | null;
        refreshToken: string | null;
        refreshTokenExpiresAt: Date | null;
        fansPage: number;
        twoFact: number;
        twoFactorSecret: string | null;
        fcmToken: string | null;
        access_token: string;
        refresh_token: string;
    } | {
        access_token: string;
        user: {
            kyc: boolean;
            email: string | null;
            userName: string | null;
            profile: string | null;
            password: string | null;
            googleId: string | null;
            appleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            profileStatus: string;
            id: string;
            firebaseUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            otpExpiresAt: Date | null;
            isDeleted: number;
            verifyEmail: number;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
            fansPage: number;
            twoFact: number;
            twoFactorSecret: string | null;
            fcmToken: string | null;
        };
    }>;
    getProfile(req: Request, query: GetProfileDto): Promise<{
        isFollow: boolean;
        kycStatus: import(".prisma/client").$Enums.KycStatus | null;
        kyc: boolean;
        email: string | null;
        userName: string | null;
        profile: string | null;
        password: string | null;
        googleId: string | null;
        appleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        displayName: string | null;
        bio: string | null;
        phoneNumber: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        age: number | null;
        otp: string | null;
        profileStatus: string;
        id: string;
        firebaseUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        otpExpiresAt: Date | null;
        isDeleted: number;
        verifyEmail: number;
        walletMnemonic: string | null;
        walletPrivateKey: string | null;
        currentPeriodEnd: Date | null;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        subscriptionEnd: Date | null;
        subscriptionStart: Date | null;
        subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
        tokenBalance: number;
        stripeAccountId: string | null;
        stripeBankAccountId: string | null;
        refreshToken: string | null;
        refreshTokenExpiresAt: Date | null;
        fansPage: number;
        twoFact: number;
        twoFactorSecret: string | null;
        fcmToken: string | null;
    }>;
    editProfile(req: Request, dto: ProfileEditDto, image: Express.Multer.File): Promise<{
        message: string;
        user: {
            totalPosts: number;
            totalFollowing: number;
            totalFollowers: number;
            kyc: boolean;
            email: string | null;
            userName: string | null;
            profile: string | null;
            password: string | null;
            googleId: string | null;
            appleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            profileStatus: string;
            id: string;
            firebaseUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            otpExpiresAt: Date | null;
            isDeleted: number;
            verifyEmail: number;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
            fansPage: number;
            twoFact: number;
            twoFactorSecret: string | null;
            fcmToken: string | null;
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
        status: import(".prisma/client").$Enums.FollowStatus;
        followerId: string;
        followingId: string;
    }>;
    unfollow(req: Request, dto: UnfollowDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
        followerId: string;
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
            kyc: boolean;
            email: string | null;
            userName: string | null;
            profile: string | null;
            password: string | null;
            googleId: string | null;
            appleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            profileStatus: string;
            id: string;
            firebaseUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            otpExpiresAt: Date | null;
            isDeleted: number;
            verifyEmail: number;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
            fansPage: number;
            twoFact: number;
            twoFactorSecret: string | null;
            fcmToken: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
        followerId: string;
        followingId: string;
    })[]>;
    getFollowingList(userId: string): Promise<({
        following: {
            userTokens: {
                tokenAddress: string | null;
            }[];
        } & {
            kyc: boolean;
            email: string | null;
            userName: string | null;
            profile: string | null;
            password: string | null;
            googleId: string | null;
            appleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            profileStatus: string;
            id: string;
            firebaseUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            otpExpiresAt: Date | null;
            isDeleted: number;
            verifyEmail: number;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
            fansPage: number;
            twoFact: number;
            twoFactorSecret: string | null;
            fcmToken: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FollowStatus;
        followerId: string;
        followingId: string;
    })[]>;
    getBlockedUsers(req: Request): Promise<({
        blocked: {
            kyc: boolean;
            email: string | null;
            userName: string | null;
            profile: string | null;
            password: string | null;
            googleId: string | null;
            appleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            profileStatus: string;
            id: string;
            firebaseUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            otpExpiresAt: Date | null;
            isDeleted: number;
            verifyEmail: number;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
            fansPage: number;
            twoFact: number;
            twoFactorSecret: string | null;
            fcmToken: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    })[]>;
    getAllUsers(query: GetAllUsersDto): Promise<{
        users: {
            kyc: boolean;
            email: string | null;
            userName: string | null;
            profile: string | null;
            password: string | null;
            googleId: string | null;
            appleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            profileStatus: string;
            id: string;
            firebaseUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            otpExpiresAt: Date | null;
            isDeleted: number;
            verifyEmail: number;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
            fansPage: number;
            twoFact: number;
            twoFactorSecret: string | null;
            fcmToken: string | null;
        }[];
    }>;
    getDisplayNames(): Promise<{
        users: {
            email: string | null;
            userName: string | null;
            displayName: string | null;
            id: string;
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
            email: string | null;
            userName: string | null;
            displayName: string | null;
            image: string | null;
            id: string;
        }[];
    }>;
    getRecentActivities(req: Request, query: RecentActivitiesDto): Promise<{
        activities: any;
    }>;
    getSuggestedUsers(req: Request, limit?: string): Promise<{
        suggestedUsers: {
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            image: string | null;
            id: string;
        }[];
    }>;
    getHitLeft(req: Request): Promise<{
        hitLeft: number;
        postCount: number;
        profile: string | null;
    }>;
    setProfileStatus(req: Request, dto: ProfileStatusSetDto): Promise<{
        message: string;
        user: {
            id: string;
            profileStatus: string;
        };
    }>;
    accountDelete(req: Request): Promise<{
        message: string;
    }>;
    reactivateAccount(dto: ReactivateAccountDto): Promise<{
        kyc: boolean;
        email: string | null;
        userName: string | null;
        profile: string | null;
        password: string | null;
        googleId: string | null;
        appleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        displayName: string | null;
        bio: string | null;
        phoneNumber: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        image: string | null;
        age: number | null;
        otp: string | null;
        profileStatus: string;
        id: string;
        firebaseUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        otpExpiresAt: Date | null;
        isDeleted: number;
        verifyEmail: number;
        walletMnemonic: string | null;
        walletPrivateKey: string | null;
        currentPeriodEnd: Date | null;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        subscriptionEnd: Date | null;
        subscriptionStart: Date | null;
        subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
        tokenBalance: number;
        stripeAccountId: string | null;
        stripeBankAccountId: string | null;
        refreshToken: string | null;
        refreshTokenExpiresAt: Date | null;
        fansPage: number;
        twoFact: number;
        twoFactorSecret: string | null;
        fcmToken: string | null;
        access_token: string;
        refresh_token: string;
    }>;
    getUserById(id: string): Promise<{
        user: {
            kycStatus: import(".prisma/client").$Enums.KycStatus | null;
            kyc: boolean;
            email: string | null;
            userName: string | null;
            profile: string | null;
            password: string | null;
            googleId: string | null;
            appleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            profileStatus: string;
            id: string;
            firebaseUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            otpExpiresAt: Date | null;
            isDeleted: number;
            verifyEmail: number;
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
            fansPage: number;
            twoFact: number;
            twoFactorSecret: string | null;
            fcmToken: string | null;
        };
    }>;
    softDeleteUser(id: string): Promise<{
        message: string;
    }>;
    createUserSubscription(req: Request, dto: CreateUserSubscriptionDto): Promise<{
        message: string;
        subscription: {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            subscriptionAmount: number;
            isDelete: number;
        };
    }>;
    getSubscriptionByUserID(userId: string): Promise<{
        subscriptions: ({
            user: {
                email: string | null;
                displayName: string | null;
                id: string;
            };
        } & {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            subscriptionAmount: number;
            isDelete: number;
        })[];
    }>;
    getUserSubscriptionById(id: string): Promise<{
        subscription: {
            user: {
                email: string | null;
                displayName: string | null;
                id: string;
            };
        } & {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            subscriptionAmount: number;
            isDelete: number;
        };
    }>;
    updateUserSubscription(id: string, dto: UpdateUserSubscriptionDto): Promise<{
        message: string;
        subscription: {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            subscriptionAmount: number;
            isDelete: number;
        };
    }>;
    deleteUserSubscription(id: string): Promise<{
        message: string;
    }>;
    enableTwoFactor(req: Request): Promise<{
        message: string;
        secret: string;
        otpauthUrl: string;
        qrCodeUrl: string;
    }>;
    verifyAndEnableTwoFactor(req: Request, dto: {
        token: string;
    }): Promise<{
        message: string;
    }>;
    disableTwoFactor(req: Request, dto: {
        token: string;
    }): Promise<{
        message: string;
    }>;
}
