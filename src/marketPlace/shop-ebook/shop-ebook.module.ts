import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModerationModule } from '../../moderation/moderation.module';
import { ShopEbookController } from './shop-ebook.controller';
import { ShopEbookService } from './shop-ebook.service';

@Module({
    imports: [PrismaModule, ModerationModule],
    controllers: [ShopEbookController],
    providers: [ShopEbookService],
})
export class ShopEbookModule { }
