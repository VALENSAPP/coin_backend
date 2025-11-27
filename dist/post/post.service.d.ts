import { PrismaService } from '../prisma/prisma.service';
export declare class PostService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createPost(userId: string, text?: string, images?: string[], files?: Express.Multer.File[], caption?: string, hashtag?: string[], location?: string, music?: string, link?: string, visibleTo?: string, taggedPeople?: string[], type?: string, raiseAmount?: number, start_time?: Date, end_time?: Date): Promise<{
        type: string | null;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        link: string | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        raiseAmount: number | null;
        start_time: Date | null;
        end_time: Date | null;
        visibleTo: string | null;
    }>;
    savePost(postId: string, userId: string): Promise<{
        message: string;
    }>;
    unsavePost(postId: string, userId: string): Promise<{
        message: string;
    }>;
    getPostByUserId(userId: string, viewerUserId?: string): Promise<{
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
        profileStatus: string | null;
        profile: string | null;
        likeCount: number;
        commentCount: number;
        isSaved: boolean;
        isLike: boolean;
        shareCount: number;
        isFollow: boolean;
        type: string | null;
        link: string | null;
        visibleTo: any;
        start_time: Date | null;
        end_time: Date | null;
        raiseAmount: number | null;
    }[]>;
    getPostById(postId: string, viewerId: string): Promise<{
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
        profile: string | null;
        profileStatus: string | null;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
        isHide: boolean;
        type: string | null;
        link: string | null;
        visibleTo: any;
        start_time: Date | null;
        end_time: Date | null;
        raiseAmount: number | null;
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
        profile: string | null;
        profileStatus: string | null;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
        isHide: boolean;
        type: string | null;
        link: string | null;
        visibleTo: any;
        start_time: Date | null;
        end_time: Date | null;
        raiseAmount: number | null;
    }[]>;
    searchAllPost(viewerUserId?: string, search?: string): Promise<{
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
        profile: string | null;
        profileStatus: string | null;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
        isHide: boolean;
        type: string | null;
        link: string | null;
        visibleTo: any;
        start_time: Date | null;
        end_time: Date | null;
        raiseAmount: number | null;
    }[] | {
        type: string;
        data: {
            email: string | null;
            userName: string | null;
            profile: string | null;
            displayName: string | null;
            bio: string | null;
            image: string | null;
            profileStatus: string;
            id: string;
        }[];
        message?: undefined;
    } | {
        message: string;
        type?: undefined;
        data?: undefined;
    } | {
        type: string;
        data: {
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
            profile: string | null;
            profileStatus: string | null;
            likeCount: number;
            commentCount: number;
            shareCount: number;
            isSaved: boolean;
            isLike: boolean;
            isFollow: boolean;
            isHide: boolean;
            type: string | null;
            link: string | null;
            visibleTo: any;
            start_time: Date | null;
            end_time: Date | null;
            raiseAmount: number | null;
        }[];
        message?: undefined;
    }>;
    getAllReel(viewerUserId?: string): Promise<{
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
        profile: string | null;
        profileStatus: string | null;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
        isHide: boolean;
        type: string | null;
        visibleTo: any;
    }[]>;
    deletePost(postId: string, userId: string): Promise<boolean>;
    editPost(postId: string, userId: string, updateData: any, files?: Express.Multer.File[]): Promise<{
        type: string | null;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        link: string | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        raiseAmount: number | null;
        start_time: Date | null;
        end_time: Date | null;
        visibleTo: string | null;
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
    editComment(commentId: string, userId: string, newComment: string): Promise<{
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
    getSavedPostsByUser(userId: string, viewerUserId: string): Promise<{
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
        profileStatus: string | null;
        profile: string | null;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
        raiseAmount: number | null;
        type: string | null;
        link: string | null;
        visibleTo: any;
        start_time: Date | null;
        end_time: Date | null;
    }[]>;
    sharePostToUser(postId: string, sharedUserId: string, receiverUserId: string): Promise<{
        message: string;
        conversationId: string;
    }>;
    getSharedPostList(userId: string): Promise<{
        id: string;
        sharedAt: Date;
        post: {
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
            profileStatus: string | null;
            profile: string | null;
            likeCount: number;
            commentCount: number;
            shareCount: number;
            visibleTo: any;
        } | null;
        sharedBy: {
            id: string;
            displayName: string | null;
            image: string | null;
        };
        receivedBy: {
            id: string;
            displayName: string | null;
            image: string | null;
        };
    }[]>;
    deleteSharedPosts(shareIds: string[], userId: string): Promise<{
        message: string;
        deletedIds: string[];
    }>;
    hidePost(postId: string, userId: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        postId: string;
    }>;
    unhidePost(postId: string, userId: string): Promise<{
        message: string;
    }>;
    getHidePost(userId: string): Promise<{
        type: string | null;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        link: string | null;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
        raiseAmount: number | null;
        start_time: Date | null;
        end_time: Date | null;
        visibleTo: string | null;
    }[]>;
    sendMessage(senderId: string, receiverId: string, message: string): Promise<{
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
    getConversations(userId: string): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.ConversationType;
        content: string | null;
        createdAt: Date;
        sender: {
            displayName: string | null;
            image: string | null;
            id: string;
        };
        receiver: {
            displayName: string | null;
            image: string | null;
            id: string;
        };
        post: {
            user: {
                displayName: string | null;
                image: string | null;
            };
            id: string;
            text: string | null;
            images: string[];
            caption: string | null;
        } | null;
        story: {
            user: {
                displayName: string | null;
                image: string | null;
            };
            id: string;
            caption: string | null;
            media: string[];
        } | null;
    }[]>;
    getConversationWithUser(userId: string, otherUserId: string): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.ConversationType;
        content: string | null;
        createdAt: Date;
        sender: {
            displayName: string | null;
            image: string | null;
            id: string;
        };
        receiver: {
            displayName: string | null;
            image: string | null;
            id: string;
        };
        post: {
            user: {
                displayName: string | null;
                image: string | null;
            };
            id: string;
            text: string | null;
            images: string[];
            caption: string | null;
        } | null;
        story: {
            user: {
                displayName: string | null;
                image: string | null;
            };
            id: string;
            caption: string | null;
            media: string[];
        } | null;
    }[]>;
}
