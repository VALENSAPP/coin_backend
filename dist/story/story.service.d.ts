import { PrismaService } from '../prisma/prisma.service';
export declare class StoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    uploadStory(userId: string, files?: Express.Multer.File[], caption?: string): Promise<{
        id: string;
        userId: string;
        media: string[];
        caption: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    viewUserStory(targetUserId: string): Promise<{
        id: string;
        userId: string;
        media: string[];
        caption: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    deleteStory(storyId: string, userId: string): Promise<{
        message: string;
    }>;
    followingStory(userId: string): Promise<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
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
            walletMnemonic: string | null;
            walletPrivateKey: string | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionEnd: Date | null;
            subscriptionStart: Date | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
        };
    } & {
        id: string;
        userId: string;
        media: string[];
        caption: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    })[]>;
    commentOnStory(userId: string, comment?: string, storyId?: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        comment: string;
        storyId: string;
    }>;
    storyLikeByUser(storyId: string, userId: string): Promise<{
        message: string;
        liked: boolean;
    }>;
}
