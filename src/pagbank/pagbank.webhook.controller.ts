import { BadRequestException, Controller, Headers, Inject, Post, Req, forwardRef } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { OrderService } from '../marketPlace/order/order.service';
import { MarketplaceBattleBoostService } from '../marketPlace/marketplace-battles/marketplace-battle-boost.service';
import { PagBankService } from './pagbank.service';

@ApiTags('billing')
@Controller('billing/pagbank')
export class PagBankWebhookController {
    constructor(
        private readonly pagBankService: PagBankService,
        @Inject(forwardRef(() => OrderService))
        private readonly orderService: OrderService,
        @Inject(forwardRef(() => MarketplaceBattleBoostService))
        private readonly marketplaceBattleBoostService: MarketplaceBattleBoostService,
    ) { }

    @Post('webhook')
    @ApiOperation({ summary: 'PagBank order/payment/transfer webhook' })
    async handleWebhook(
        @Req() req: Request,
        @Headers('x-authenticity-token') authenticityToken?: string,
    ) {
        const rawBody =
            typeof req.body === 'string' || Buffer.isBuffer(req.body)
                ? req.body
                : JSON.stringify(req.body || {});

        if (!this.pagBankService.verifyWebhookSignature(rawBody as any, authenticityToken)) {
            throw new BadRequestException('Invalid PagBank webhook signature');
        }

        const body = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
            ? req.body
            : JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8') || '{}');

        // Transfer / payout notifications (seller withdrawals)
        const looksLikeTransfer =
            String(body?.object || body?.type || '').toLowerCase().includes('transfer') ||
            !!body?.from_account ||
            !!body?.to_account ||
            String(body?.id || '').startsWith('TR') ||
            String(body?.reference_id || '').startsWith('wd_');

        if (looksLikeTransfer && !String(body?.id || '').startsWith('ORDE')) {
            const transferResult = await this.pagBankService.handleTransferWebhook(body);
            return { received: true, ...transferResult };
        }

        const orderId =
            body?.id ||
            body?.order_id ||
            body?.resourceId ||
            body?.resource_id ||
            body?.charges?.[0]?.id;

        // Notifications often only include an id — always re-fetch order (zero-trust).
        let order = body;
        if (orderId && typeof orderId === 'string' && orderId.startsWith('ORDE')) {
            try {
                order = await this.pagBankService.getOrder(orderId);
            } catch {
                order = body;
            }
        } else if (body?.links || body?.reference_id) {
            order = body;
        } else if (typeof orderId === 'string') {
            try {
                order = await this.pagBankService.getOrder(orderId);
            } catch {
                return { received: true, processed: false, reason: 'Unable to load order' };
            }
        }

        if (!this.pagBankService.isOrderPaid(order)) {
            return { received: true, processed: false, reason: 'Not paid yet' };
        }

        const result = await this.pagBankService.handlePaidOrder(order);

        // Marketplace cart: create Order rows + credit pending wallet
        if (result.type === 'marketplace' && result.paymentId && !result.skipped) {
            try {
                await this.orderService.createOrderFromPagBankPayment(result.paymentId);
            } catch (error: any) {
                console.error('PagBank marketplace order create failed:', error?.message || error);
            }
        }

        // Marketplace battle boost
        if (result.type === 'marketplace_battle_boost' && result.paymentId && !result.skipped) {
            try {
                await this.marketplaceBattleBoostService.handlePagBankBoostPaid(result.paymentId);
            } catch (error: any) {
                console.error('PagBank battle boost activate failed:', error?.message || error);
            }
        }

        return { received: true, ...result };
    }
}
