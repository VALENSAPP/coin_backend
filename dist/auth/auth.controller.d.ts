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
    getLoginHistory(body: GetLoginHistoryDto): Promise<{
        message: string;
        loginHistory: {
            userId: string;
            id: string;
            loginDate: Date;
        }[];
    }>;
}
