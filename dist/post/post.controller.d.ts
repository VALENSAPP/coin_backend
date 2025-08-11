import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostByUserDto } from './dto/get-post-by-user.dto';
import { GetPostByIdDto } from './dto/get-post-by-id.dto';
import { DeletePostDto } from './dto/delete-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { PostLikeByUserDto, PostLikeListDto, SavePostDto, UnsavePostDto } from './dto/post-like.dto';
import { Request } from 'express';
import { CommentOnPostDto, GetCommentListOnPostDto, CommentDeleteDto } from './dto/post-comment.dto';
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
        userName: string | null;
        userImage: string | null;
        user: undefined;
        isSaved: boolean;
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
    getAllPost(req: Request): Promise<{
        userName: string | null;
        userImage: string | null;
        user: undefined;
        isSaved: boolean;
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
        userName: string | null;
        userImage: string | null;
        user: undefined;
        isSaved: boolean;
        savedAt: Date;
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
    getPostById(params: GetPostByIdDto): Promise<{
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
}
