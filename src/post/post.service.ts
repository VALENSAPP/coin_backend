import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadImageToS3 } from '../common/s3.util';
import { Prisma } from '@prisma/client';

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

  async savePost(postId: string, userId: string) {
    if (!postId) throw new BadRequestException('Post ID required');
    if (!userId) throw new BadRequestException('User ID required');

    const post = await this.prisma.post.findUnique({ where: { id: postId, deletedAt: null } });
    if (!post) throw new BadRequestException('Post not found');

    // Upsert-like behavior: if already saved, do nothing; else create
    try {
      await this.prisma.savePost.create({ data: { postId, userId } });
    } catch (error) {
      // If unique constraint violation, treat as already saved
      const isUniqueViolation = (error as Prisma.PrismaClientKnownRequestError)?.code === 'P2002';
      if (!isUniqueViolation) throw error;
    }
    return { message: 'Post saved successfully' };
  }

  async unsavePost(postId: string, userId: string) {
    if (!postId) throw new BadRequestException('Post ID required');
    if (!userId) throw new BadRequestException('User ID required');

    // Delete if exists; if not, return idempotent success
    await this.prisma.savePost.delete({
      where: { postId_userId: { postId, userId } },
    }).catch(() => undefined);

    return { message: 'Post unsaved successfully' };
  }

  async getPostByUserId(userId: string, viewerUserId?: string) {
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
    // Fetch saved flags for the viewer
    let savedSet: Set<string> = new Set();
    if (viewerUserId) {
      const saved = await this.prisma.savePost.findMany({
        where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
        select: { postId: true },
      });
      savedSet = new Set(saved.map(s => s.postId));
    }

    return posts.map(post => ({
      ...post,
      userName: post.user?.displayName || null,
      userImage: post.user?.image || null,
      user: undefined, // Remove the nested user object
      isSaved: savedSet.has(post.id),
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

async getAllPost(viewerUserId?: string) {
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
      _count: {
        select: {
          likes: true,      // from Post model
          comments: true,   // from Post model
        },
      },
    },
  });

  let savedSet: Set<string> = new Set();
  let likedSet: Set<string> = new Set();

  if (viewerUserId) {
    // Fetch saved posts for viewer
    const saved = await this.prisma.savePost.findMany({
      where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
      select: { postId: true },
    });
    savedSet = new Set(saved.map(s => s.postId));

    // Fetch liked posts for viewer
    const liked = await this.prisma.postLike.findMany({
      where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
      select: { postId: true },
    });
    likedSet = new Set(liked.map(l => l.postId));
  }

  return posts.map(post => ({
    id: post.id,
    text: post.text,
    images: post.images,
    caption: post.caption,
    hashtag: post.hashtag,
    location: post.location,
    music: post.music,
    taggedPeople: post.taggedPeople,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    deletedAt: post.deletedAt,
    userId: post.userId,
    userName: post.user?.displayName || null,
    userImage: post.user?.image || null,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isSaved: savedSet.has(post.id),
    isLike: likedSet.has(post.id), // ✅ true if viewer liked
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

  async postLikeByUser(postId: string, userId: string) {
    if (!postId) throw new BadRequestException('Post ID required');
    if (!userId) throw new BadRequestException('User ID required');

    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { 
        id: postId,
        deletedAt: null 
      },
    });
    
    if (!post) {
      throw new BadRequestException('Post not found');
    }

    // Check if user already liked the post
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike the post
      await this.prisma.postLike.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });
      return { message: 'Post unliked successfully', liked: false };
    } else {
      // Like the post
      await this.prisma.postLike.create({
        data: {
          postId,
          userId,
        },
      });
      return { message: 'Post liked successfully', liked: true };
    }
  }

  async postLikeList(postId: string) {
    if (!postId) throw new BadRequestException('Post ID required');

    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { 
        id: postId,
        deletedAt: null 
      },
    });
    
    if (!post) {
      throw new BadRequestException('Post not found');
    }

    // Get likes with user information
    const likes = await this.prisma.postLike.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get total like count
    const totalLikes = await this.prisma.postLike.count({
      where: { postId },
    });

    // Format the response
    const formattedLikes = likes.map((like: any) => ({
      id: like.id,
      userId: like.user.id,
      displayName: like.user.displayName,
      image: like.user.image,
      createdAt: like.createdAt,
    }));

    return {
      likes: formattedLikes,
      totalLikes,
    };
  }

  // Add a comment to a post
  async commentOnPost(postId: string, userId: string, comment: string) {
    if (!postId) throw new BadRequestException('Post ID required');
    if (!userId) throw new BadRequestException('User ID required');
    if (!comment || comment.trim() === '') throw new BadRequestException('Comment required');
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new BadRequestException('Post not found');
    return this.prisma.postComment.create({
      data: { postId, userId, comment },
    });
  }

  // Get comments for a post
  async getCommentListOnPost(postId: string) {
    if (!postId) throw new BadRequestException('Post ID required');
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new BadRequestException('Post not found');
    const comments = await this.prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { displayName: true, image: true, id: true } },
      },
    });
    const commentCount = await this.prisma.postComment.count({ where: { postId } });
    return {
      comments: comments.map((c: any) => ({
        id: c.id,
        comment: c.comment,
        createdAt: c.createdAt,
        userId: c.userId,
        displayName: c.user.displayName,
        image: c.user.image,
      })),
      commentCount,
    };
  }

  // Delete a comment
  async commentDelete(postId: string, commentId: string, userId: string) {
    if (!postId) throw new BadRequestException('Post ID required');
    if (!commentId) throw new BadRequestException('Comment ID required');
    if (!userId) throw new BadRequestException('User ID required');
    const comment = await this.prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.userId !== userId || comment.postId !== postId) throw new BadRequestException('Not allowed');
    await this.prisma.postComment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted' };
  }

  async getSavedPostsByUser(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');

    const saved = await this.prisma.savePost.findMany({
      where: { userId, post: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { displayName: true, image: true } },
          },
        },
      },
    });

    return saved.map(s => ({
      ...s.post,
      userName: s.post.user?.displayName || null,
      userImage: s.post.user?.image || null,
      user: undefined,
      isSaved: true,
      savedAt: s.createdAt,
    }));
  }
} 