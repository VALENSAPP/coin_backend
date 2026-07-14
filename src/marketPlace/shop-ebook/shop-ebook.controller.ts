import {
    Body,
    Controller,
    Delete,
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

    @Delete(':ebookId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'ebookId', type: 'string' })
    @ApiOperation({ summary: 'Delete shop ebook by ID (owner only)' })
    async deleteEbook(@Req() req: Request, @Param('ebookId') ebookId: string) {
        const userId = (req.user as any)?.userId;
        return this.shopEbookService.deleteEbook(userId, ebookId);
    }

    @Get('purchasedEbook')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all purchased shop ebooks for logged-in user' })
    async getPurchasedEbooks(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.shopEbookService.getPurchasedEbooks(userId);
    }

    @Get('byEbookId/:ebookId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'ebookId', type: 'string' })
    @ApiOperation({ summary: 'Get shop ebook by ebook ID with purchase status for logged-in user' })
    async getByEbookId(@Req() req: Request, @Param('ebookId') ebookId: string) {
        const userId = (req.user as any)?.userId;
        return this.shopEbookService.getByEbookId(ebookId, userId);
    }

    @Get('closet/:closetId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'closetId', type: 'string' })
    @ApiOperation({ summary: 'Get all ebooks by closet ID with purchase status for logged-in user' })
    async getByClosetId(@Req() req: Request, @Param('closetId') closetId: string) {
        const userId = (req.user as any)?.userId;
        return this.shopEbookService.getByClosetId(closetId, userId);
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
