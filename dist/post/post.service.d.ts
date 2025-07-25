import { PrismaService } from '../prisma/prisma.service';
export declare class PostService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createPost(userId: string, text?: string, images?: string[], files?: Express.Multer.File[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        userId: string;
    }>;
    getPostByUserId(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        userId: string;
    }[]>;
    getAllPost(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        userId: string;
    }[]>;
    deletePost(postId: string, userId: string): Promise<boolean>;
}
