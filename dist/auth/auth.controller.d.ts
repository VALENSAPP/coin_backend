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
}
