import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenPurchaseModule } from '../token-purchase/token-purchase.module';
import { DeepLinkController } from './deep-link.controller';
import { MissionShareService } from './mission-share.service';

@Module({
  imports: [PrismaModule, TokenPurchaseModule],
  controllers: [DeepLinkController],
  providers: [MissionShareService],
})
export class DeepLinkModule {}
