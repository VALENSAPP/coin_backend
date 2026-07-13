import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { uploadFileToS3, uploadImageToS3 } from '../../common/s3.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopEbookDto } from './dto/create-shop-ebook.dto';

const SHOP_EBOOK_IMAGES_FOLDER = 'shop-ebook-images';
const SHOP_EBOOK_PDF_FOLDER = 'shop-ebook-pdfs';

@Injectable()
export class ShopEbookService {
    constructor(private readonly prisma: PrismaService) { }

    async getPurchasedEbooks(viewerUserId: string) {
        await this.ensureUserExists(viewerUserId);

        const successfulPayments = await (this.prisma as any).shopEbookPayments.findMany({
            where: {
                buyerId: viewerUserId,
                status: 'SUCCEEDED',
            },
            include: {
                ebook: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const seenEbookIds = new Set<string>();
        const ebooks = successfulPayments
            .filter((payment: any) => {
                if (!payment.ebook || seenEbookIds.has(payment.ebookId)) return false;
                seenEbookIds.add(payment.ebookId);
                return true;
            })
            .map((payment: any) => ({
                ...payment.ebook,
                isPurchased: true,
                purchasedAt: payment.createdAt,
            }));

        return {
            ebooks,
            totalPurchasedEbooks: ebooks.length,
        };
    }

    async getByEbookId(ebookId: string, viewerUserId: string) {
        if (!ebookId) throw new BadRequestException('ebookId is required');
        await this.ensureUserExists(viewerUserId);

        const ebook = await (this.prisma as any).shopEbook.findUnique({
            where: { id: ebookId },
        });

        if (!ebook) throw new NotFoundException('Ebook not found');

        const successfulPayment = await (this.prisma as any).shopEbookPayments.findFirst({
            where: {
                buyerId: viewerUserId,
                ebookId,
                status: 'SUCCEEDED',
            },
            select: { id: true },
        });

        return {
            ebook,
            isPurchased: !!successfulPayment,
        };
    }

    async getByClosetId(closetId: string, viewerUserId: string) {
        if (!closetId) throw new BadRequestException('closetId is required');
        await this.ensureUserExists(viewerUserId);

        const closet = await this.prisma.mycloset.findUnique({
            where: { id: closetId },
            select: { id: true, userId: true, shopName: true, shopUsername: true, shopLogo: true },
        });

        if (!closet) throw new NotFoundException('Closet not found');

        const ebooks = await (this.prisma as any).shopEbook.findMany({
            where: { closetId },
            orderBy: { createdAt: 'desc' },
        });

        const ebookIds = ebooks.map((ebook: any) => ebook.id);
        let purchasedEbookSet = new Set<string>();

        if (ebookIds.length) {
            const successfulPayments = await (this.prisma as any).shopEbookPayments.findMany({
                where: {
                    buyerId: viewerUserId,
                    closetId,
                    ebookId: { in: ebookIds },
                    status: 'SUCCEEDED',
                },
                select: { ebookId: true },
            });

            purchasedEbookSet = new Set(successfulPayments.map((payment: any) => payment.ebookId));
        }

        const ebooksWithDownloadAccess = ebooks.map((ebook: any) => ({
            ...ebook,
            isPurchased: purchasedEbookSet.has(ebook.id),
        }));

        return {
            closet,
            ebooks: ebooksWithDownloadAccess,
            totalEbooks: ebooksWithDownloadAccess.length,
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
