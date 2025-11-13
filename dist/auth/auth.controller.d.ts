import { AuthService } from './auth.service';
import { RegistrationType } from '../user/user.controller';
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class GetLoginHistoryDto {
    userId: string;
}
export declare class LoginDto {
    email?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    twitterAccessToken?: string;
    appleId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<{
        message: string;
        user: {
            error: boolean;
            msg: any;
            body: any[];
        } | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            age: number | null;
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
            profileStatus: string;
            access_token: string;
            refresh_token: string;
        };
    }>;
    refreshToken(body: RefreshTokenDto): Promise<{
        access_token: string;
        refresh_token: string;
        message: string;
    }>;
    getProfile(req: any): Promise<{
        message: string;
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            appleId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            age: number | null;
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
            profileStatus: string;
        };
    }>;
    getLoginHistory(body: GetLoginHistoryDto): Promise<{
        message: string;
        loginHistory: {
            id: string;
            userId: string;
            loginDate: Date;
        }[];
    }>;
}
