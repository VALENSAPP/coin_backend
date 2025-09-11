import { Module } from '@nestjs/common';
import { TokenPurchaseService } from './token-purchase.service';
import { TokenPurchaseController } from './token-purchase.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [PrismaModule, TokenModule],
  controllers: [TokenPurchaseController],
  providers: [TokenPurchaseService],
  exports: [TokenPurchaseService],
})
export class TokenPurchaseModule {}