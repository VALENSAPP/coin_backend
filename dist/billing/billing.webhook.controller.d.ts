import { Request } from 'express';
import { BillingService } from './billing.service';
import { TokenPurchaseService } from '../token-purchase/token-purchase.service';
export declare class BillingWebhookController {
    private readonly billingService;
    private readonly tokenPurchaseService;
    private stripe;
    constructor(billingService: BillingService, tokenPurchaseService: TokenPurchaseService);
    handleWebhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
    private handlePaymentIntentSucceeded;
    private handlePaymentIntentFailed;
}
