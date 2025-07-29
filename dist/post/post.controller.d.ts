import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostByUserDto } from './dto/get-post-by-user.dto';
import { DeletePostDto } from './dto/delete-post.dto';
import { Request } from 'express';
export declare class PostController {
    private readonly postService;
    constructor(postService: PostService);
    createPost(req: Request, body: CreatePostDto, files?: Express.Multer.File[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }>;
    getPostByUserId(query: GetPostByUserDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }[]>;
    getAllPost(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string;
        text: string | null;
        images: string[];
        caption: string | null;
        hashtag: string[];
        location: string | null;
        music: string | null;
        taggedPeople: string[];
    }[]>;
    deletePost(req: Request, query: DeletePostDto): Promise<boolean>;
}
