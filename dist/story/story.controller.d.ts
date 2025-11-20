import { StoryService } from './story.service';
import { Request } from 'express';
export declare class StoryController {
    private readonly storyService;
    constructor(storyService: StoryService);
    uploadStory(req: Request, caption: string, files?: Express.Multer.File[]): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        caption: string | null;
        media: string[];
    }>;
    viewUserStory(userId: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        caption: string | null;
        media: string[];
    }[]>;
    deleteStory(req: Request, storyId: string): Promise<{
        message: string;
    }>;
    followingStory(req: Request): Promise<({
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
        };
    } & {
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        caption: string | null;
        media: string[];
    })[]>;
    commentOnStory(req: Request, comment: string, storyId: string): Promise<{
        type: import(".prisma/client").$Enums.ConversationType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        postId: string | null;
        senderId: string;
        receiverId: string;
        storyId: string | null;
    }>;
    storyLikeByUser(req: Request, storyId: string): Promise<{
        message: string;
        liked: boolean;
    }>;
}
