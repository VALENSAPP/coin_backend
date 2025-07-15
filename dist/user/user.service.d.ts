import { PrismaService } from '../prisma/prisma.service';
export type RegistrationType = 'NORMAL' | 'GOOGLE' | 'TWITTER' | 'WALLET';
export declare class UserService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(data: {
        email?: string;
        password?: string;
        googleId?: string;
        twitterId?: string;
        walletAddress?: string;
        registrationType: RegistrationType;
    }): Promise<{
        id: string;
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        createdAt: Date;
        updatedAt: Date;
    }>;
    validateUser(data: {
        email?: string;
        password?: string;
        googleId?: string;
        twitterId?: string;
        walletAddress?: string;
        registrationType: RegistrationType;
    }): Promise<{
        id: string;
        email: string | null;
        password: string | null;
        googleId: string | null;
        twitterId: string | null;
        walletAddress: string | null;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
