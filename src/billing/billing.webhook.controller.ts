import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { BillingService } from './billing.service';
import { TokenPurchaseService } from '../token-purchase/token-purchase.service';

@ApiExcludeController()
@Controller('billing')
export class BillingWebhookController {
  private stripe: Stripe;

  constructor(
    private readonly billingService: BillingService,
    private readonly tokenPurchaseService: TokenPurchaseService
  ) {
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
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === 'token_purchase') {
          await this.tokenPurchaseService.handleCheckoutSessionCompleted(session.id);
        } else if (session.metadata?.type === 'buy_hit') {
          await this.billingService.handleBuyHitPayment(session);
        } else if (session.metadata?.type === 'fans_page_subscription') {
          await this.billingService.handleFansPageSubscriptionPayment(session);
        } else if (session.metadata?.type === 'fan_subscription_buy') {
          await this.billingService.handleFanSubscriptionBuyPayment(session);
        } else {
          await this.billingService.handleCheckoutSessionCompleted(session);
        }
        break;
      case 'invoice.paid':
        await this.billingService.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.billingService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.billingService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'transfer.created':
        await this.billingService.handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
      case 'payout.paid':
        await this.billingService.handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
      case 'payout.failed':
        await this.billingService.handlePayoutFailed(event.data.object as Stripe.Payout);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      // Check if this is a token purchase by looking at metadata
      if (paymentIntent.metadata?.type === 'token_purchase') {
        await this.tokenPurchaseService.handlePaymentSuccess(paymentIntent.id);
      } else if (paymentIntent.metadata?.type === 'following') {
        await this.billingService.handleOneTimePaymentSuccess(paymentIntent);
      }
    } catch (error) {
      console.error('Error handling payment intent success:', error);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      // Check if this is a token purchase by looking at metadata
      if (paymentIntent.metadata?.type === 'token_purchase') {
        await this.tokenPurchaseService.handlePaymentFailed(paymentIntent.id);
      }
    } catch (error) {
      console.error('Error handling payment intent failure:', error);
    }
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    try {
      // Check if this is a token purchase by looking at metadata
      if (session.metadata?.type === 'token_purchase') {
        await this.tokenPurchaseService.handleCheckoutSessionExpired(session.id);
      }
    } catch (error) {
      console.error('Error handling checkout session expiration:', error);
    }
  }
}


