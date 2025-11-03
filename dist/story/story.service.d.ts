import { PrismaService } from '../prisma/prisma.service';
export declare class StoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    uploadStory(userId: string, files?: Express.Multer.File[], caption?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string;
        media: string[];
        caption: string | null;
    }>;
    viewUserStory(targetUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string;
        media: string[];
        caption: string | null;
    }[]>;
    deleteStory(storyId: string, userId: string): Promise<{
        message: string;
    }>;
    followingStory(userId: string): Promise<({
        user: {
            id: string;
            firebaseUserId: string | null;
            email: string | null;
            password: string | null;
            googleId: string | null;
            twitterId: string | null;
            walletAddress: string | null;
            registrationType: import(".prisma/client").$Enums.RegistrationType;
<<<<<<< HEAD
<<<<<<< HEAD
            displayName: string | null;
            bio: string | null;
            phoneNumber: string | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            image: string | null;
            age: number | null;
            otp: string | null;
            id: string;
            firebaseUserId: string | null;
=======
>>>>>>> ea1e26356efa11780a170230f6bfa24216e3930b
=======
>>>>>>> ea1e26356efa11780a170230f6bfa24216e3930b
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
            kyc: boolean;
>>>>>>> ea1e26356efa11780a170230f6bfa24216e3930b
=======
            kyc: boolean;
>>>>>>> ea1e26356efa11780a170230f6bfa24216e3930b
            stripeAccountId: string | null;
            stripeBankAccountId: string | null;
            refreshToken: string | null;
            refreshTokenExpiresAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string;
        media: string[];
        caption: string | null;
    })[]>;
    commentOnStory(userId: string, comment?: string, storyId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ConversationType;
        content: string | null;
        senderId: string;
        receiverId: string;
        postId: string | null;
        storyId: string | null;
    }>;
    storyLikeByUser(storyId: string, userId: string): Promise<{
        message: string;
        liked: boolean;
    }>;
}
