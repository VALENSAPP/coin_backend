import { PrismaService } from '../prisma/prisma.service';
export declare class PostService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createPost(userId: string, text?: string, images?: string[], files?: Express.Multer.File[], caption?: string, hashtag?: string[], location?: string, music?: string, taggedPeople?: string[]): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }>;
    getPostByUserId(userId: string): Promise<{
        userName: string | null;
        userImage: string | null;
        user: undefined;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }[]>;
    getPostById(postId: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }>;
    getAllPost(): Promise<{
        userName: string | null;
        userImage: string | null;
        user: undefined;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }[]>;
    deletePost(postId: string, userId: string): Promise<boolean>;
    editPost(postId: string, userId: string, updateData: any, files?: Express.Multer.File[]): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }>;
    postLikeByUser(postId: string, userId: string): Promise<{
        message: string;
        liked: boolean;
    }>;
    postLikeList(postId: string): Promise<{
        likes: {
            id: any;
            userId: any;
            displayName: any;
            image: any;
            createdAt: any;
        }[];
        totalLikes: number;
    }>;
    commentOnPost(postId: string, userId: string, comment: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        postId: string;
        comment: string;
    }>;
    getCommentListOnPost(postId: string): Promise<{
        comments: {
            id: any;
            comment: any;
            createdAt: any;
            userId: any;
            displayName: any;
            image: any;
        }[];
        commentCount: number;
    }>;
    commentDelete(postId: string, commentId: string, userId: string): Promise<{
        message: string;
    }>;
}
