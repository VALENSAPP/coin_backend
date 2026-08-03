import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PagBankModule } from '../../pagbank/pagbank.module';
import { OrderModule } from '../order/order.module';
import { PaymentController } from './payment.controller';
import { PaymentProviderResolver } from './payment-provider.resolver';
import { PaymentService } from './payment.service';

@Module({
    imports: [PrismaModule, OrderModule, forwardRef(() => PagBankModule)],
    controllers: [PaymentController],
    providers: [PaymentService, PaymentProviderResolver],
    exports: [PaymentService, PaymentProviderResolver],
})
export class PaymentModule { }
