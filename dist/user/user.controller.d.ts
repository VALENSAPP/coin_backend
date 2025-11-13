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
        };
    }>;
    getProfile(req: Request, query: GetProfileDto): Promise<{
        isFollow: boolean;
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
        followingId: string;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    unfollow(req: Request, dto: UnfollowDto): Promise<{
        followingId: string;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    blockUser(req: Request, dto: BlockUserDto): Promise<{
        blockedId: string;
        id: string;
        createdAt: Date;
        blockerId: string;
    }>;
    unblockUser(req: Request, dto: UnblockUserDto): Promise<{
        blockedId: string;
        id: string;
        createdAt: Date;
        blockerId: string;
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
        };
    } & {
        followingId: string;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        };
    } & {
        followingId: string;
        followerId: string;
        status: import(".prisma/client").$Enums.FollowStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        };
    } & {
        blockedId: string;
        id: string;
        createdAt: Date;
        blockerId: string;
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
        access_token: string;
        refresh_token: string;
    }>;
    getUserById(id: string): Promise<{
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
        };
    }>;
    softDeleteUser(id: string): Promise<{
        message: string;
    }>;
    createUserSubscription(req: Request, dto: CreateUserSubscriptionDto): Promise<{
        message: string;
        subscription: {
            userId: string;
            subscriptionAmount: number;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            isDelete: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getUserSubscriptions(query: any): Promise<{
        subscriptions: ({
            user: {
                email: string | null;
                displayName: string | null;
                id: string;
            };
        } & {
            userId: string;
            subscriptionAmount: number;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            isDelete: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
            subscriptionAmount: number;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            isDelete: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    updateUserSubscription(id: string, dto: UpdateUserSubscriptionDto): Promise<{
        message: string;
        subscription: {
            userId: string;
            subscriptionAmount: number;
            status: import(".prisma/client").$Enums.UserSubscriptionStatus;
            isDelete: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    deleteUserSubscription(id: string): Promise<{
        message: string;
    }>;
}
