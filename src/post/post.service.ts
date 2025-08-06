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
    
    // Handle empty strings by converting them to null
    const processedText = text && text.trim() !== '' ? text : null;
    const processedCaption = caption && caption.trim() !== '' ? caption : null;
    const processedLocation = location && location.trim() !== '' ? location : null;
    const processedMusic = music && music.trim() !== '' ? music : null;
    
    // Handle array fields - if they're empty strings or undefined, use empty array
    const processedHashtag = hashtag && hashtag.length > 0 ? hashtag : [];
    const processedTaggedPeople = taggedPeople && taggedPeople.length > 0 ? taggedPeople : [];
    
    return this.prisma.post.create({
      data: {
        userId,
        text: processedText,
        images: imageUrls,
        caption: processedCaption,
        hashtag: processedHashtag,
        location: processedLocation,
        music: processedMusic,
        taggedPeople: processedTaggedPeople,
      },
    });
  }

  async getPostByUserId(userId: string) {
    console.log('Service received userId:', userId);
    if (!userId) throw new BadRequestException('User ID required');
    const posts = await this.prisma.post.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            displayName: true,
            image: true,
          },
        },
      },
    });
    return posts.map(post => ({
      ...post,
      userName: post.user?.displayName || null,
      userImage: post.user?.image || null,
      user: undefined, // Remove the nested user object
    }));
  }

  async getPostById(postId: string) {
    if (!postId) throw new BadRequestException('Post ID required');
    
    const post = await this.prisma.post.findUnique({
      where: { 
        id: postId,
        deletedAt: null 
      },
    });
    
    if (!post) {
      throw new BadRequestException('Post not found');
    }
    
    return post;
  }

  async getAllPost() {
    const posts = await this.prisma.post.findMany({
      where: { deletedAt: null }, 
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            displayName: true,
            image: true,
          },
        },
      },
    });
    // Map posts to add userName and userImage fields
    return posts.map(post => ({
      ...post,
      userName: post.user?.displayName || null,
      userImage: post.user?.image || null,
      user: undefined, // Remove the nested user object
    }));
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

  async editPost(postId: string, userId: string, updateData: any, files?: Express.Multer.File[]) {
    // Check if post exists and belongs to user
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    console.log('Service received post:', post?.userId,userId);
    
    if (!post || post.deletedAt) throw new BadRequestException('Post not found');
    if (post.userId !== userId) throw new BadRequestException('Unauthorized to edit this post');

    // Handle new image uploads
    let imageUrls: string[] = post.images || [];
    if (files && files.length > 0) {
      const uploadedUrls = await Promise.all(files.map(f => uploadImageToS3(f, 'post-images')));
      imageUrls = imageUrls.concat(uploadedUrls);
    }

    // Process update data - only update fields that are explicitly provided and not empty
    const updateFields: any = {};
    
    // Only update text if it's provided and not empty string
    if (updateData.text !== undefined && updateData.text !== null && updateData.text.trim() !== '') {
      updateFields.text = updateData.text;
    } else if (updateData.text === '') {
      // If empty string is explicitly sent, set to null
      updateFields.text = null;
    }
    
    // Only update caption if it's provided and not empty string
    if (updateData.caption !== undefined && updateData.caption !== null && updateData.caption.trim() !== '') {
      updateFields.caption = updateData.caption;
    } else if (updateData.caption === '') {
      // If empty string is explicitly sent, set to null
      updateFields.caption = null;
    }
    
    // Only update hashtag if it's provided and not empty array
    if (updateData.hashtag !== undefined && Array.isArray(updateData.hashtag)) {
      updateFields.hashtag = updateData.hashtag.length > 0 ? updateData.hashtag : [];
    }
    
    // Only update location if it's provided and not empty string
    if (updateData.location !== undefined && updateData.location !== null && updateData.location.trim() !== '') {
      updateFields.location = updateData.location;
    } else if (updateData.location === '') {
      // If empty string is explicitly sent, set to null
      updateFields.location = null;
    }
    
    // Only update music if it's provided and not empty string
    if (updateData.music !== undefined && updateData.music !== null && updateData.music.trim() !== '') {
      updateFields.music = updateData.music;
    } else if (updateData.music === '') {
      // If empty string is explicitly sent, set to null
      updateFields.music = null;
    }
    
    // Only update taggedPeople if it's provided and not empty array
    if (updateData.taggedPeople !== undefined && Array.isArray(updateData.taggedPeople)) {
      updateFields.taggedPeople = updateData.taggedPeople.length > 0 ? updateData.taggedPeople : [];
    }
    
    // Update images if new files are uploaded
    if (files && files.length > 0) {
      updateFields.images = imageUrls;
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: updateFields,
    });
  }
} 