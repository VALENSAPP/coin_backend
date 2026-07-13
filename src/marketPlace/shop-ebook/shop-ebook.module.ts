import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShopEbookController } from './shop-ebook.controller';
import { ShopEbookService } from './shop-ebook.service';

@Module({
    imports: [PrismaModule],
    controllers: [ShopEbookController],
    providers: [ShopEbookService],
})
export class ShopEbookModule { }
