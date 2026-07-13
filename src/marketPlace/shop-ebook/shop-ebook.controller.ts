import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
    ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateShopEbookDto } from './dto/create-shop-ebook.dto';
import { ShopEbookService } from './shop-ebook.service';

@ApiTags('marketplace-ebooks')
@Controller('marketplace-ebooks')
export class ShopEbookController {
    constructor(private readonly shopEbookService: ShopEbookService) { }

    @Get('closet/:closetId')
    @ApiParam({ name: 'closetId', type: 'string' })
    @ApiOperation({ summary: 'Get all ebooks by closet ID' })
    async getByClosetId(@Param('closetId') closetId: string) {
        return this.shopEbookService.getByClosetId(closetId);
    }

    @Post('create')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 20 },
            { name: 'ebookpdf', maxCount: 1 },
        ]),
    )
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create shop ebook and upload assets to S3' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['closetId', 'amount', 'ebookpdf'],
            properties: {
                closetId: { type: 'string' },
                caption: { type: 'string' },
                text: { type: 'string' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Optional preview images for ebook',
                },
                ebookpdf: {
                    type: 'string',
                    format: 'binary',
                    description: 'Ebook PDF file',
                },
                amount: { type: 'number', minimum: 0 },
                isDownload: { type: 'boolean', default: true },
                promoCode: { type: 'string' },
                tableContent: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Can also be sent as JSON string',
                },
            },
        },
    })
    async createEbook(
        @Req() req: Request,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateShopEbookDto,
        @UploadedFiles() files?: { images?: any[]; ebookpdf?: any[] },
    ) {
        const userId = (req.user as any)?.userId;
        const ebookPdfFile = files?.ebookpdf?.[0];
        return this.shopEbookService.createEbook(userId, dto, files?.images, ebookPdfFile);
    }
}
