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
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
            userName: string | null;
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            id: string;
            walletPrivateKey: string | null;
            walletMnemonic: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isDeleted: number;
            otpExpiresAt: Date | null;
            verifyEmail: number;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            subscriptionStart: Date | null;
            subscriptionEnd: Date | null;
            currentPeriodEnd: Date | null;
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
}
