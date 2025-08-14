import { PrismaService } from '../prisma/prisma.service';
export declare class PostService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createPost(userId: string, text?: string, images?: string[], files?: Express.Multer.File[], caption?: string, hashtag?: string[], location?: string, music?: string, taggedPeople?: string[]): Promise<{
        id: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deletedAt: Date | null;
    }>;
    savePost(postId: string, userId: string): Promise<{
        message: string;
    }>;
    unsavePost(postId: string, userId: string): Promise<{
        message: string;
    }>;
    getPostByUserId(userId: string, viewerUserId?: string): Promise<{
        userName: string | null;
        userImage: string | null;
        user: undefined;
        isSaved: boolean;
        id: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deletedAt: Date | null;
    }[]>;
    getPostById(postId: string): Promise<{
        id: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deletedAt: Date | null;
    }>;
    getAllPost(viewerUserId?: string): Promise<{
        id: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string;
        userName: string | null;
        userImage: string | null;
        likeCount: number;
        commentCount: number;
        isSaved: boolean;
        isLike: boolean;
    }[]>;
    deletePost(postId: string, userId: string): Promise<boolean>;
    editPost(postId: string, userId: string, updateData: any, files?: Express.Multer.File[]): Promise<{
        id: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deletedAt: Date | null;
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
        id: string;
        createdAt: Date;
        userId: string;
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
    getSavedPostsByUser(userId: string): Promise<{
        userName: string | null;
        userImage: string | null;
        user: undefined;
        isSaved: boolean;
        savedAt: Date;
        id: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deletedAt: Date | null;
    }[]>;
}
