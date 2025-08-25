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
}
