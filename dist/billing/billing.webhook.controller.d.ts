import { Request } from 'express';
import { BillingService } from './billing.service';
export declare class BillingWebhookController {
    private readonly billingService;
    private stripe;
    constructor(billingService: BillingService);
    handleWebhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
}
