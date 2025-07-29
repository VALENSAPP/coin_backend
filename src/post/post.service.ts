import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadImageToS3 } from '../common/s3.util';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(userId: string, text?: string, images?: string[], files?: Express.Multer.File[], caption?: string, hashtag?: string[], location?: string, music?: string, taggedPeople?: string[]) {
    if (!userId) throw new BadRequestException('User ID required');
    let imageUrls: string[] = images || [];
    // Upload files to S3 and collect URLs
    if (files && files.length > 0) {
      const uploadedUrls = await Promise.all(files.map(f => uploadImageToS3(f, 'post-images')));
      imageUrls = imageUrls.concat(uploadedUrls);
    }
    return this.prisma.post.create({
      data: {
        userId,
        text,
        images: imageUrls,
        caption,
        hashtag,
        location,
        music,
        taggedPeople,
      },
    });
  }

  async getPostByUserId(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    return this.prisma.post.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllPost() {
    return this.prisma.post.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new BadRequestException('Post not found');
    if (post.userId !== userId) throw new BadRequestException('Unauthorized');
    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
    return true;
  }
} 