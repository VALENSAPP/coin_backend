import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { uploadFileToS3, uploadImageToS3 } from '../../common/s3.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopEbookDto } from './dto/create-shop-ebook.dto';

const SHOP_EBOOK_IMAGES_FOLDER = 'shop-ebook-images';
const SHOP_EBOOK_PDF_FOLDER = 'shop-ebook-pdfs';

@Injectable()
export class ShopEbookService {
    constructor(private readonly prisma: PrismaService) { }

    async getByClosetId(closetId: string) {
        if (!closetId) throw new BadRequestException('closetId is required');

        const closet = await this.prisma.mycloset.findUnique({
            where: { id: closetId },
            select: { id: true, userId: true, shopName: true, shopUsername: true, shopLogo: true },
        });

        if (!closet) throw new NotFoundException('Closet not found');

        const ebooks = await (this.prisma as any).shopEbook.findMany({
            where: { closetId },
            orderBy: { createdAt: 'desc' },
        });

        return {
            closet,
            ebooks,
            totalEbooks: ebooks.length,
        };
    }

    private async ensureUserExists(userId: string) {
        if (!userId) throw new BadRequestException('User ID required');

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) throw new NotFoundException('User not found');
    }

    private async ensureClosetOwnership(closetId: string, userId: string) {
        if (!closetId) throw new BadRequestException('closetId is required');

        const closet = await this.prisma.mycloset.findFirst({
            where: { id: closetId, userId },
            select: { id: true },
        });

        if (!closet) throw new NotFoundException('Closet not found for this user');
    }

    private async uploadImages(files?: any[]) {
        if (!files?.length) return [];

        const invalidFile = files.find((file) => !file.mimetype?.startsWith('image/'));
        if (invalidFile) {
            throw new BadRequestException('images must contain only image files');
        }

        return Promise.all(files.map((file) => uploadImageToS3(file, SHOP_EBOOK_IMAGES_FOLDER)));
    }

    private async uploadEbookPdf(file?: any) {
        if (!file) throw new BadRequestException('ebookpdf file is required');

        const isPdfByMime = file.mimetype === 'application/pdf';
        const isPdfByName = file.originalname?.toLowerCase().endsWith('.pdf');

        if (!isPdfByMime && !isPdfByName) {
            throw new BadRequestException('Only PDF files are allowed for ebookpdf');
        }

        return uploadFileToS3(file, SHOP_EBOOK_PDF_FOLDER);
    }

    async createEbook(
        userId: string,
        dto: CreateShopEbookDto,
        imageFiles?: any[],
        ebookPdfFile?: any,
    ) {
        await this.ensureUserExists(userId);
        await this.ensureClosetOwnership(dto.closetId, userId);

        const [imageUrls, ebookPdfUrl] = await Promise.all([
            this.uploadImages(imageFiles),
            this.uploadEbookPdf(ebookPdfFile),
        ]);

        const created = await (this.prisma as any).shopEbook.create({
            data: {
                userId,
                closetId: dto.closetId,
                caption: dto.caption ?? null,
                text: dto.text ?? null,
                images: imageUrls,
                ebookpdf: ebookPdfUrl,
                amount: dto.amount,
                isDownload: dto.isDownload ?? true,
                promoCode: dto.promoCode ?? null,
                tableContent: dto.tableContent ?? [],
            },
        });

        return {
            message: 'Shop ebook created successfully',
            ebook: created,
        };
    }
}
