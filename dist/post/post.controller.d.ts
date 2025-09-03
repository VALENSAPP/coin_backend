import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostByUserDto } from './dto/get-post-by-user.dto';
import { GetPostByIdDto } from './dto/get-post-by-id.dto';
import { DeletePostDto } from './dto/delete-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { SharePostDto, DeleteSharedPostDto } from './dto/share-post.dto';
import { PostLikeByUserDto, PostLikeListDto, SavePostDto, UnsavePostDto } from './dto/post-like.dto';
import { Request } from 'express';
import { CommentOnPostDto, GetCommentListOnPostDto, CommentDeleteDto } from './dto/post-comment.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class PostController {
    private readonly postService;
    constructor(postService: PostService);
    createPost(req: Request, body: CreatePostDto, files?: Express.Multer.File[]): Promise<{
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
    editPost(req: Request, postId: string, body: EditPostDto, files?: Express.Multer.File[]): Promise<{
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
    getPostByUserId(req: Request, query: GetPostByUserDto): Promise<{
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
        shareCount: number;
        isFollow: boolean;
    }[]>;
    getAllPost(req: Request): Promise<{
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
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
        isHide: boolean;
    }[]>;
    deletePost(req: Request, query: DeletePostDto): Promise<boolean>;
    postLikeByUser(req: Request, body: PostLikeByUserDto): Promise<{
        message: string;
        liked: boolean;
    }>;
    postLikeList(query: PostLikeListDto): Promise<{
        likes: {
            id: any;
            userId: any;
            displayName: any;
            image: any;
            createdAt: any;
        }[];
        totalLikes: number;
    }>;
    commentOnPost(req: Request, dto: CommentOnPostDto): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        postId: string;
        comment: string;
    }>;
    editComment(req: Request, dto: {
        commentId: string;
        comment: string;
    }): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        postId: string;
        comment: string;
    }>;
    getCommentListOnPost(dto: GetCommentListOnPostDto): Promise<{
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
    deleteComment(req: Request, dto: CommentDeleteDto): Promise<{
        message: string;
    }>;
    savePost(req: Request, dto: SavePostDto): Promise<{
        message: string;
    }>;
    unsavePost(req: Request, dto: UnsavePostDto): Promise<{
        message: string;
    }>;
    getSavedPosts(req: Request): Promise<{
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
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
    }[]>;
    getPostById(req: Request, params: GetPostByIdDto): Promise<{
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
        shareCount: number;
        isSaved: boolean;
        isLike: boolean;
        isFollow: boolean;
        isHide: boolean;
    }>;
    sharePostToUser(body: SharePostDto): Promise<{
        message: string;
        conversationId: string;
    }>;
    getSharedPostList(req: Request): Promise<{
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
            likeCount: number;
            commentCount: number;
            shareCount: number;
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
    deleteSharedPost(req: Request, dto: DeleteSharedPostDto): Promise<{
        message: string;
        deletedIds: string[];
    }>;
    hidePost(req: Request, postId: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        postId: string;
    }>;
    unhidePost(req: Request, postId: string): Promise<{
        message: string;
    }>;
    getHidePost(req: Request): Promise<{
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
    sendMessage(req: Request, dto: SendMessageDto): Promise<{
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
    getConversations(req: Request): Promise<{
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
    getConversationWithUser(req: Request, otherUserId: string): Promise<{
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
