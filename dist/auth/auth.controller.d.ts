import { AuthService } from './auth.service';
import { RegistrationType } from '../user/user.controller';
export declare class LoginDto {
    email?: string;
    password?: string;
    googleId?: string;
    twitterId?: string;
    walletAddress?: string;
    registrationType: RegistrationType;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<{
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
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
            access_token: string;
        };
    }>;
    getProfile(req: any): Promise<{
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
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            tokenBalance: number;
        };
    }>;
}
