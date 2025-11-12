import { PrismaService } from '../prisma/prisma.service';
export declare class KycService {
    private prisma;
    private veriffBase;
    private veriffKey;
    constructor(prisma: PrismaService);
    createVeriffSession(userId: string, documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'ID_CARD', firstName: string, lastName: string): Promise<{
        sessionId: any;
        url: any;
    }>;
    handleWebhook(body: any): Promise<{
        success: boolean;
    }>;
    getKycStatus(userId: string): Promise<{
        id: number;
        userId: string;
        veriffSessionId: string;
        veriffUrl: string;
        status: import(".prisma/client").$Enums.KycStatus;
        documentType: string | null;
        webhookData: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
}
