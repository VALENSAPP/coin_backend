import { KycService } from './kyc.service';
export declare class KycController {
    private readonly kycService;
    constructor(kycService: KycService);
    startKyc(userId: string, documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'ID_CARD', firstName: string, lastName: string): Promise<{
        sessionId: any;
        url: any;
    }>;
    handleWebhook(req: any): Promise<{
        success: boolean;
        message: string;
        body: any;
    } | {
        success: boolean;
        message?: undefined;
        body?: undefined;
    }>;
    getStatus(userId: string): Promise<{
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
    syncStatus(userId: string): Promise<{
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
    syncAllPending(): Promise<{
        success: boolean;
        total: number;
        updated: number;
        errors: number;
        unchanged: number;
    }>;
}
