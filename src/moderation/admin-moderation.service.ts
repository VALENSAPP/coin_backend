import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  ApproveContentDto,
  GetModerationQueueDto,
  ModerationContentTypeEnum,
  RejectContentDto,
} from './dto/admin-moderation.dto';

@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get paginated pending moderation queue items
   */
  async getPendingQueue(dto: GetModerationQueueDto) {
    const page = Math.max(Number(dto.page) || 1, 1);
    const limit = Math.min(Math.max(Number(dto.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const type = dto.type || ModerationContentTypeEnum.ALL;

    const results: any[] = [];

    // 1. Fetch pending Posts
    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.POST) {
      const posts = await (this.prisma as any).post.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          isDelete: 'no',
          deletedAt: null,
          ...(dto.search
            ? {
                OR: [
                  { text: { contains: dto.search, mode: 'insensitive' } },
                  { caption: { contains: dto.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          user: {
            select: { id: true, displayName: true, userName: true, image: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      posts.forEach((p: any) => {
        results.push({
          contentType: 'POST',
          contentId: p.id,
          title: p.caption || p.text?.slice(0, 50) || 'Post',
          content: p.text || p.caption || '',
          images: p.images || [],
          postType: p.type,
          format: p.format,
          moderationStatus: p.moderationStatus,
          moderationReason: p.moderationReason,
          moderationScore: p.moderationScore,
          moderatedBy: p.moderatedBy,
          createdAt: p.createdAt,
          author: p.user,
        });
      });
    }

    // 2. Fetch pending Comments
    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.COMMENT) {
      const comments = await (this.prisma as any).postComment.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          ...(dto.search
            ? {
                comment: { contains: dto.search, mode: 'insensitive' },
              }
            : {}),
        },
        include: {
          user: {
            select: { id: true, displayName: true, userName: true, image: true, email: true },
          },
          post: {
            select: { id: true, text: true, caption: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      comments.forEach((c: any) => {
        results.push({
          contentType: 'COMMENT',
          contentId: c.id,
          title: `Comment on post (${c.postId})`,
          content: c.comment,
          images: [],
          moderationStatus: c.moderationStatus,
          moderationReason: c.moderationReason,
          moderationScore: c.moderationScore,
          moderatedBy: c.moderatedBy,
          createdAt: c.createdAt,
          author: c.user,
          postContext: c.post,
        });
      });
    }

    // 3. Fetch pending Closet Items (Products)
    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.PRODUCT) {
      const products = await (this.prisma as any).closetItems.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          isDeleted: false,
          ...(dto.search
            ? {
                OR: [
                  { name: { contains: dto.search, mode: 'insensitive' } },
                  { description: { contains: dto.search, mode: 'insensitive' } },
                  { category: { contains: dto.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          user: {
            select: { id: true, displayName: true, userName: true, image: true, email: true },
          },
          closet: {
            select: { id: true, shopName: true, shopUsername: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      products.forEach((prod: any) => {
        results.push({
          contentType: 'PRODUCT',
          contentId: prod.id,
          title: prod.name,
          content: prod.description || '',
          images: prod.images || [],
          category: prod.category,
          brand: prod.brand,
          price: prod.price,
          moderationStatus: prod.moderationStatus,
          moderationReason: prod.moderationReason,
          moderationScore: prod.moderationScore,
          moderatedBy: prod.moderatedBy,
          createdAt: prod.createdAt,
          author: prod.user,
          shop: prod.closet,
        });
      });
    }

    // 4. Fetch pending Shop Ebooks
    if (type === ModerationContentTypeEnum.ALL || type === ModerationContentTypeEnum.EBOOK) {
      const ebooks = await (this.prisma as any).shopEbook.findMany({
        where: {
          moderationStatus: 'PENDING_APPROVAL',
          ...(dto.search
            ? {
                OR: [
                  { caption: { contains: dto.search, mode: 'insensitive' } },
                  { text: { contains: dto.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          user: {
            select: { id: true, displayName: true, userName: true, image: true, email: true },
          },
          closet: {
            select: { id: true, shopName: true, shopUsername: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      ebooks.forEach((eb: any) => {
        results.push({
          contentType: 'EBOOK',
          contentId: eb.id,
          title: eb.caption || eb.text || 'Shop Ebook',
          content: eb.text || '',
          images: eb.images || [],
          ebookpdf: eb.ebookpdf,
          amount: eb.amount,
          moderationStatus: eb.moderationStatus,
          moderationReason: eb.moderationReason,
          moderationScore: eb.moderationScore,
          moderatedBy: eb.moderatedBy,
          createdAt: eb.createdAt,
          author: eb.user,
          shop: eb.closet,
        });
      });
    }

    // Sort combined items by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = results.length;
    const paginatedItems = results.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
    };
  }

  /**
   * Get single item details by type and ID
   */
  async getItemDetails(contentType: string, contentId: string) {
    const normalizedType = contentType.toUpperCase();

    let item: any = null;
    let authorId: string | null = null;

    if (normalizedType === 'POST') {
      item = await (this.prisma as any).post.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
        },
      });
      authorId = item?.userId;
    } else if (normalizedType === 'COMMENT') {
      item = await (this.prisma as any).postComment.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          post: true,
        },
      });
      authorId = item?.userId;
    } else if (normalizedType === 'PRODUCT') {
      item = await (this.prisma as any).closetItems.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          closet: true,
        },
      });
      authorId = item?.userId;
    } else if (normalizedType === 'EBOOK') {
      item = await (this.prisma as any).shopEbook.findUnique({
        where: { id: contentId },
        include: {
          user: { select: { id: true, displayName: true, userName: true, image: true, email: true } },
          closet: true,
        },
      });
      authorId = item?.userId;
    }

    if (!item) {
      throw new NotFoundException(`${contentType} with ID ${contentId} not found`);
    }

    const logs = await (this.prisma as any).moderationAuditLog.findMany({
      where: { contentId, contentType: normalizedType },
      orderBy: { createdAt: 'desc' },
    });

    return {
      contentType: normalizedType,
      contentId,
      item,
      authorId,
      auditLogs: logs,
    };
  }

  /**
   * Admin approves flagged item
   */
  async approveItem(dto: ApproveContentDto, adminUserId: string) {
    const { contentType, contentId, notes } = dto;
    const now = new Date();

    let authorId: string | null = null;

    if (contentType === 'POST') {
      const post = await (this.prisma as any).post.findUnique({ where: { id: contentId } });
      if (!post) throw new NotFoundException('Post not found');
      authorId = post.userId;

      await (this.prisma as any).post.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'APPROVED',
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    } else if (contentType === 'COMMENT') {
      const comment = await (this.prisma as any).postComment.findUnique({ where: { id: contentId } });
      if (!comment) throw new NotFoundException('Comment not found');
      authorId = comment.userId;

      await (this.prisma as any).postComment.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'APPROVED',
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    } else if (contentType === 'PRODUCT') {
      const product = await (this.prisma as any).closetItems.findUnique({ where: { id: contentId } });
      if (!product) throw new NotFoundException('Product not found');
      authorId = product.userId;

      await (this.prisma as any).closetItems.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'APPROVED',
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    } else if (contentType === 'EBOOK') {
      const ebook = await (this.prisma as any).shopEbook.findUnique({ where: { id: contentId } });
      if (!ebook) throw new NotFoundException('Shop Ebook not found');
      authorId = ebook.userId;

      await (this.prisma as any).shopEbook.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'APPROVED',
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    }

    // Record in Audit Log
    if (authorId) {
      await (this.prisma as any).moderationAuditLog.create({
        data: {
          contentType,
          contentId,
          authorId,
          aiVerdict: 'APPROVED',
          adminAction: 'APPROVED',
          adminReason: notes || 'Approved by admin',
          adminId: adminUserId,
        },
      });
    }

    return {
      message: `${contentType} approved successfully and is now publicly visible`,
      contentId,
      status: 'APPROVED',
    };
  }

  /**
   * Admin rejects flagged item
   */
  async rejectItem(dto: RejectContentDto, adminUserId: string) {
    const { contentType, contentId, reason } = dto;
    const now = new Date();

    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Rejection reason is required');
    }

    let authorId: string | null = null;

    if (contentType === 'POST') {
      const post = await (this.prisma as any).post.findUnique({ where: { id: contentId } });
      if (!post) throw new NotFoundException('Post not found');
      authorId = post.userId;

      await (this.prisma as any).post.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'REJECTED',
          moderationReason: reason.trim(),
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    } else if (contentType === 'COMMENT') {
      const comment = await (this.prisma as any).postComment.findUnique({ where: { id: contentId } });
      if (!comment) throw new NotFoundException('Comment not found');
      authorId = comment.userId;

      await (this.prisma as any).postComment.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'REJECTED',
          moderationReason: reason.trim(),
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    } else if (contentType === 'PRODUCT') {
      const product = await (this.prisma as any).closetItems.findUnique({ where: { id: contentId } });
      if (!product) throw new NotFoundException('Product not found');
      authorId = product.userId;

      await (this.prisma as any).closetItems.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'REJECTED',
          moderationReason: reason.trim(),
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    } else if (contentType === 'EBOOK') {
      const ebook = await (this.prisma as any).shopEbook.findUnique({ where: { id: contentId } });
      if (!ebook) throw new NotFoundException('Shop Ebook not found');
      authorId = ebook.userId;

      await (this.prisma as any).shopEbook.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'REJECTED',
          moderationReason: reason.trim(),
          moderatedBy: adminUserId,
          moderatedAt: now,
        },
      });
    }

    // Record in Audit Log
    if (authorId) {
      await (this.prisma as any).moderationAuditLog.create({
        data: {
          contentType,
          contentId,
          authorId,
          aiVerdict: 'REJECTED',
          adminAction: 'REJECTED',
          adminReason: reason.trim(),
          adminId: adminUserId,
        },
      });
    }

    return {
      message: `${contentType} rejected successfully`,
      contentId,
      status: 'REJECTED',
      reason,
    };
  }

  /**
   * Get moderation statistics
   */
  async getStats() {
    const [
      pendingPosts,
      approvedPosts,
      rejectedPosts,
      pendingComments,
      pendingProducts,
      pendingEbooks,
    ] = await Promise.all([
      (this.prisma as any).post.count({ where: { moderationStatus: 'PENDING_APPROVAL', isDelete: 'no', deletedAt: null } }),
      (this.prisma as any).post.count({ where: { moderationStatus: 'APPROVED', isDelete: 'no', deletedAt: null } }),
      (this.prisma as any).post.count({ where: { moderationStatus: 'REJECTED', isDelete: 'no', deletedAt: null } }),
      (this.prisma as any).postComment.count({ where: { moderationStatus: 'PENDING_APPROVAL' } }),
      (this.prisma as any).closetItems.count({ where: { moderationStatus: 'PENDING_APPROVAL', isDeleted: false } }),
      (this.prisma as any).shopEbook.count({ where: { moderationStatus: 'PENDING_APPROVAL' } }),
    ]);

    const totalPending = pendingPosts + pendingComments + pendingProducts + pendingEbooks;

    return {
      totalPending,
      pendingPosts,
      approvedPosts,
      rejectedPosts,
      pendingComments,
      pendingProducts,
      pendingEbooks,
    };
  }
}
