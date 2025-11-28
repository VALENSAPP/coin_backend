import { Module } from '@nestjs/common';
import { TokenPurchaseService } from './token-purchase.service';
import { TokenPurchaseController } from './token-purchase.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, TokenModule, UserModule, NotificationModule],
  controllers: [TokenPurchaseController],
  providers: [TokenPurchaseService],
  exports: [TokenPurchaseService],
})
export class TokenPurchaseModule {}