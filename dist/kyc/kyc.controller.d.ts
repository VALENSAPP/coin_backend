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
        userId: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.KycStatus;
        veriffSessionId: string;
        veriffUrl: string;
        documentType: string | null;
        webhookData: import("@prisma/client/runtime/library").JsonValue | null;
    } | null>;
    syncStatus(userId: string): Promise<{
        success: boolean;
        message: string;
        status?: undefined;
        updated?: undefined;
    } | {
        success: boolean;
        status: "PENDING" | "SUBMITTED" | "APPROVED" | "DECLINED";
        updated: boolean;
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
