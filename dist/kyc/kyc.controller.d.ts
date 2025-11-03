import { KycService } from './kyc.service';
import { VeriffWebhookDto } from './dto/webhook.dto';
export declare class KycController {
    private readonly kycService;
    constructor(kycService: KycService);
    startKyc(userId: string, documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'ID_CARD', firstName: string, lastName: string): Promise<{
        sessionId: any;
        url: any;
    }>;
    webhook(body: VeriffWebhookDto): Promise<{
        success: boolean;
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
}
