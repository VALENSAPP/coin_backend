import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostByUserDto } from './dto/get-post-by-user.dto';
import { DeletePostDto } from './dto/delete-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { Request } from 'express';
export declare class PostController {
    private readonly postService;
    constructor(postService: PostService);
    createPost(req: Request, body: CreatePostDto, files?: Express.Multer.File[]): Promise<{
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
    editPost(req: Request, postId: string, body: EditPostDto, files?: Express.Multer.File[]): Promise<{
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
    getPostByUserId(query: GetPostByUserDto): Promise<{
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
    getAllPost(): Promise<{
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
    deletePost(req: Request, query: DeletePostDto): Promise<boolean>;
}
