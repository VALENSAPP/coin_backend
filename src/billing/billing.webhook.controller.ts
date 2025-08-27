import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { BillingService } from './billing.service';

@ApiExcludeController()
@Controller('billing')
export class BillingWebhookController {
  private stripe: Stripe;

  constructor(private readonly billingService: BillingService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent((req as any).body, signature, endpointSecret);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Webhook signature verification failed.', err.message);
      return { received: true };
    }

    switch (event.type) {
      case 'invoice.paid':
        await this.billingService.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.billingService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.billingService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return { received: true };
  }
}


