import { PrismaService } from '../prisma/prisma.service';
export declare class StoryCleanupService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    purgeExpiredStories(): Promise<void>;
}
