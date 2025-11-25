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
    handleWebhook(verification: any): Promise<void>;
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
    fetchVeriffStatus(sessionId: string): Promise<{
        status: any;
        reason: any;
    } | null>;
    syncKycStatus(userId: string): Promise<{
        success: boolean;
        message: string;
        status?: undefined;
        updated?: undefined;
        reason?: undefined;
    } | {
        success: boolean;
        status: "PENDING" | "SUBMITTED" | "APPROVED" | "DECLINED";
        updated: boolean;
        reason: any;
        message?: undefined;
    }>;
    syncPendingKycCron(): Promise<void>;
    syncAllPendingKyc(): Promise<{
        success: boolean;
        total: number;
        updated: number;
        errors: number;
        unchanged: number;
    }>;
}
