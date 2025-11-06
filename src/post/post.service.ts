import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadImageToS3 } from '../common/s3.util';
import { Prisma } from '@prisma/client';
import { profile } from 'console';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(userId: string, text?: string, images?: string[], files?: Express.Multer.File[], caption?: string, hashtag?: string[], location?: string, music?: string, link?: string, taggedPeople?: string[], type?: string, raiseAmount?: number, start_time?: Date, end_time?: Date) {
    if (!userId) throw new BadRequestException('User ID required');

    // For crowdfunding posts, check hits and validate required fields
    if (type === 'crowdfunding' || type === 'support') {
      if (raiseAmount === null || raiseAmount === undefined || start_time === null || start_time === undefined || end_time === null || end_time === undefined) {
        throw new BadRequestException('raiseAmount, start_time, and end_time are required for crowdfunding posts');
      }

      // Check if user has hits left
      const postHit = await this.prisma.postHit.findFirst({
        where: { userId },
      });

      if (!postHit || postHit.hitLeft <= 0) {
        throw new BadRequestException('No hits left to create a crowdfunding post');
      }
    }

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
    const processedLink = link && link.trim() !== '' ? link : null;

    // Handle array fields - if they're empty strings or undefined, use empty array
    const processedHashtag = hashtag && hashtag.length > 0 ? hashtag : [];
    const processedTaggedPeople = taggedPeople && taggedPeople.length > 0 ? taggedPeople : [];

    // Transform raiseAmount to number
    const processedRaiseAmount = raiseAmount ? parseFloat(raiseAmount.toString()) : null;
    const processedStartTime = start_time ? new Date(start_time) : null;
    const processedEndTime = end_time ? new Date(end_time) : null;

    return this.prisma.$transaction(async (tx) => {
      // For crowdfunding, decrement hit
      if (type === 'crowdfunding' || type === 'support') {
        const postHit = await tx.postHit.findFirst({ where: { userId } });
        if (!postHit) throw new BadRequestException('PostHit record not found');
        await tx.postHit.update({
          where: { id: postHit.id },
          data: { hitLeft: { decrement: 1 } },
        });
      }

      // Create the post
      return tx.post.create({
        data: {
          userId,
          text: processedText,
          images: imageUrls,
          caption: processedCaption,
          hashtag: processedHashtag,
          location: processedLocation,
          music: processedMusic,
          link: processedLink,
          taggedPeople: processedTaggedPeople,
          type,
          raiseAmount: processedRaiseAmount,
          start_time: processedStartTime,
          end_time: processedEndTime,
        },
      });
    }, {
      timeout: 10000 // Increase timeout to 10 seconds
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
      _count: {
        select: {
          likes: true,      // from Post model
          comments: true,   // from Post model
          shares: true,
        },
      },
    }
  });
    // Fetch saved flags for the viewer
    let savedSet: Set<string> = new Set();
  let likedSet: Set<string> = new Set();

    if (viewerUserId) {
      const saved = await this.prisma.savePost.findMany({
        where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
        select: { postId: true },
      });
      savedSet = new Set(saved.map(s => s.postId));
    }

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

  // Build follow map for viewer vs authors
  let followMap: Record<string, boolean> = {};
  if (viewerUserId) {
    const authorIds = Array.from(new Set(posts.map(p => p.userId)));
    if (authorIds.length > 0) {
      const follows = await this.prisma.followerAndFollowing.findMany({
        where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
        select: { followingId: true },
      });
      followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {} as Record<string, boolean>);
    }
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
    shareCount: post._count.shares,
    isFollow: !!followMap[post.userId],
  }));
  }

  async getPostById(postId: string, viewerId: string) {
  if (!postId) throw new BadRequestException('Post ID required');

  // ✅ Find single post
  const post = await this.prisma.post.findUnique({
    where: { 
      id: postId,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          displayName: true,
          image: true,
          profile: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true,
        },
      },
    },
  });

  if (!post) {
    throw new BadRequestException('Post not found');
  }

  // ✅ Fetch saved state for this viewer
  const saved = await this.prisma.savePost.findFirst({
    where: { userId: viewerId, postId },
  });

  // ✅ Fetch like state for this viewer
  const liked = await this.prisma.postLike.findFirst({
    where: { userId: viewerId, postId },
  });

  // ✅ Fetch hide state for this viewer
  const hidden = viewerId
    ? await this.prisma.hidePost.findFirst({ where: { userId: viewerId, postId } })
    : null;

  // ✅ Follow status (does viewer follow the post's author?)
  let isFollow = false;
  if (viewerId) {
    const follow = await this.prisma.followerAndFollowing.findFirst({
      where: { followerId: viewerId, followingId: post.userId, status: 'ACCEPTED' },
      select: { id: true },
    });
    isFollow = !!follow;
  }

  // ✅ Return single structured response
  return {
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
    profile: post.user?.profile || null,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    shareCount: post._count.shares,
    isSaved: !!saved,   // ✅ true if viewer saved
    isLike: !!liked,    // ✅ true if viewer liked
    isFollow,
    isHide: !!hidden,
  };
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
          profile: true,
        },
      },
      _count: {
        select: {
          likes: true,      // from Post model
          comments: true,   // from Post model
          shares: true,     
        },
      },
    },
  });

  let savedSet: Set<string> = new Set();
  let likedSet: Set<string> = new Set();
  let followMap: Record<string, boolean> = {};
  let hiddenSet: Set<string> = new Set();

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

    // ✅ Fetch follow status for each post's author
    const authorIds = Array.from(new Set(posts.map(p => p.userId)));
    if (authorIds.length > 0) {
      const follows = await this.prisma.followerAndFollowing.findMany({
        where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
        select: { followingId: true },
      });
      followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {} as Record<string, boolean>);
    }

    // ✅ Fetch hidden posts for viewer
    if (posts.length > 0) {
      const hidden = await this.prisma.hidePost.findMany({
        where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
        select: { postId: true },
      });
      hiddenSet = new Set(hidden.map(h => h.postId));
    }
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
    profile: post.user?.profile || null,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    shareCount: post._count.shares, 
    isSaved: savedSet.has(post.id),
    isLike: likedSet.has(post.id), // ✅ true if viewer liked
    isFollow: !!followMap[post.userId],
    isHide: hiddenSet.has(post.id),
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

  async editComment(commentId: string, userId: string, newComment: string) {
  if (!commentId) throw new BadRequestException('Comment ID required');
  if (!userId) throw new BadRequestException('User ID required');
  if (!newComment || newComment.trim() === '') throw new BadRequestException('New comment text required');

  // Find the comment
  const comment = await this.prisma.postComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new BadRequestException('Comment not found');
  if (comment.userId !== userId) throw new BadRequestException('Not allowed to edit this comment');

  // Update the comment
  return this.prisma.postComment.update({
    where: { id: commentId },
    data: { comment: newComment },
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

async getSavedPostsByUser(userId: string, viewerUserId: string) {
  if (!userId) throw new BadRequestException('User ID required');

  // ✅ Get saved posts with full post + user + counts
  const savedPosts = await this.prisma.savePost.findMany({
    where: { userId, post: { deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          user: {
            select: {
              displayName: true,
              image: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              shares: true,
            },
          },
        },
      },
    },
  });

  let savedSet: Set<string> = new Set();
  let likedSet: Set<string> = new Set();

  if (viewerUserId) {
    const postIds = savedPosts.map(sp => sp.postId);

    // ✅ Fetch saved posts for viewer
    const saved = await this.prisma.savePost.findMany({
      where: { userId: viewerUserId, postId: { in: postIds } },
      select: { postId: true },
    });
    savedSet = new Set(saved.map(s => s.postId));

    // ✅ Fetch liked posts for viewer
    const liked = await this.prisma.postLike.findMany({
      where: { userId: viewerUserId, postId: { in: postIds } },
      select: { postId: true },
    });
    likedSet = new Set(liked.map(l => l.postId));

    // ✅ Fetch follow status for each post's author
    const authorIds = Array.from(new Set(savedPosts.map(sp => sp.post.userId)));
    const follows = await this.prisma.followerAndFollowing.findMany({
      where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
      select: { followingId: true },
    });
    var followMap: Record<string, boolean> = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {} as Record<string, boolean>);
  }

  // ✅ Map savedPosts to return actual post info
  return savedPosts.map(sp => {
    const post = sp.post;
    return {
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
      shareCount: post._count.shares,
      isSaved: savedSet.has(post.id),
      isLike: likedSet.has(post.id),
      isFollow: !!(typeof followMap !== 'undefined' && followMap[post.userId]),
    };
  });
}

async sharePostToUser(postId: string, sharedUserId: string, receiverUserId: string) {
  if (!postId) throw new BadRequestException('Post ID required');
  if (!sharedUserId) throw new BadRequestException('Sender user ID required');
  if (!receiverUserId) throw new BadRequestException('Receiver user ID required');

  // Check if post exists and is not deleted
  const post = await this.prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
  });
  if (!post) throw new BadRequestException('Post not found');

  // Prevent sharing to self
  if (sharedUserId === receiverUserId) {
    throw new BadRequestException('Cannot share post to yourself');
  }

  // Check if a share conversation already exists between these two users for this post
  let conversation = await this.prisma.conversation.findFirst({
    where: {
      senderId: sharedUserId,
      receiverId: receiverUserId,
      postId,
      type: 'POST_SHARE',
    },
  });

  if (conversation) {
    // Already shared, return existing conversation info
    return { message: 'Post already shared between these users', conversationId: conversation.id };
  }

  // Create the conversation record for post share
  conversation = await this.prisma.conversation.create({
    data: {
      type: 'POST_SHARE',
      senderId: sharedUserId,
      receiverId: receiverUserId,
      postId,
    },
  });

  return { message: 'Post shared successfully', conversationId: conversation.id };
}

async getSharedPostList(userId: string) {
  if (!userId) throw new BadRequestException('User ID required');

  const conversations = await this.prisma.conversation.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
      type: 'POST_SHARE',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          user: { select: { displayName: true, image: true } },
          _count: { select: { likes: true, comments: true, conversations: { where: { type: 'POST_SHARE' } } } },
        },
      },
      sender: { select: { id: true, displayName: true, image: true } },
      receiver: { select: { id: true, displayName: true, image: true } },
    },
  });

  return conversations.map(conv => ({
    id: conv.id,
    sharedAt: conv.createdAt,
    post: conv.post && {
      id: conv.post.id,
      text: conv.post.text,
      images: conv.post.images,
      caption: conv.post.caption,
      hashtag: conv.post.hashtag,
      location: conv.post.location,
      music: conv.post.music,
      taggedPeople: conv.post.taggedPeople,
      createdAt: conv.post.createdAt,
      updatedAt: conv.post.updatedAt,
      deletedAt: conv.post.deletedAt,
      userId: conv.post.userId,
      userName: conv.post.user?.displayName || null,
      userImage: conv.post.user?.image || null,
      likeCount: conv.post._count.likes,
      commentCount: conv.post._count.comments,
      shareCount: conv.post._count.conversations,
    },
    sharedBy: conv.sender && {
      id: conv.sender.id,
      displayName: conv.sender.displayName,
      image: conv.sender.image,
    },
    receivedBy: conv.receiver && {
      id: conv.receiver.id,
      displayName: conv.receiver.displayName,
      image: conv.receiver.image,
    },
  }));
}

async deleteSharedPosts(shareIds: string[], userId: string) {
  if (!Array.isArray(shareIds) || shareIds.length === 0) throw new BadRequestException('Share IDs required');
  if (!userId) throw new BadRequestException('User ID required');

  // Find all conversation records for the given IDs
  const conversations = await this.prisma.conversation.findMany({
    where: { id: { in: shareIds }, type: 'POST_SHARE' },
  });

  // Filter to only those the user is authorized to delete
  const deletableIds = conversations
    .filter(conv => conv.senderId === userId || conv.receiverId === userId)
    .map(conv => conv.id);

  if (deletableIds.length === 0) throw new BadRequestException('No authorized shared posts to delete');

  // Delete all authorized conversation records
  await this.prisma.conversation.deleteMany({
    where: { id: { in: deletableIds }, type: 'POST_SHARE' },
  });

  return { message: 'Shared posts deleted successfully', deletedIds: deletableIds };
}

async hidePost(postId: string, userId: string) {
  if (!postId || !userId) throw new BadRequestException('Post ID and User ID required');
  return this.prisma.hidePost.upsert({
    where: { postId_userId: { postId, userId } },
    update: {},
    create: { postId, userId },
  });
}

async unhidePost(postId: string, userId: string) {
  if (!postId || !userId) throw new BadRequestException('Post ID and User ID required');
  await this.prisma.hidePost.deleteMany({ where: { postId, userId } });
  return { message: 'Post unhidden successfully' };
}

async getHidePost(userId: string) {
  if (!userId) throw new BadRequestException('User ID required');
  const hidden = await this.prisma.hidePost.findMany({
    where: { userId },
    include: { post: true },
  });
  return hidden.map(h => h.post);
}

// Chat functionality using unified Conversation table
async sendMessage(senderId: string, receiverId: string, message: string) {
  if (!senderId) throw new BadRequestException('Sender ID required');
  if (!receiverId) throw new BadRequestException('Receiver ID required');
  if (!message || message.trim() === '') throw new BadRequestException('Message required');

  // Prevent sending message to self
  if (senderId === receiverId) {
    throw new BadRequestException('Cannot send message to yourself');
  }

  const conversation = await this.prisma.conversation.create({
    data: {
      type: 'CHAT',
      senderId,
      receiverId,
      content: message,
    },
  });

  return conversation;
}

async getConversations(userId: string) {
  if (!userId) throw new BadRequestException('User ID required');

  const conversations = await this.prisma.conversation.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, displayName: true, image: true } },
      receiver: { select: { id: true, displayName: true, image: true } },
      post: {
        select: {
          id: true,
          text: true,
          images: true,
          caption: true,
          user: { select: { displayName: true, image: true } }
        }
      },
      story: {
        select: {
          id: true,
          caption: true,
          media: true,
          user: { select: { displayName: true, image: true } }
        }
      },
    },
  });

  return conversations.map(conv => ({
    id: conv.id,
    type: conv.type,
    content: conv.content,
    createdAt: conv.createdAt,
    sender: conv.sender,
    receiver: conv.receiver,
    post: conv.post,
    story: conv.story,
  }));
}

async getConversationWithUser(userId: string, otherUserId: string) {
  if (!userId) throw new BadRequestException('User ID required');
  if (!otherUserId) throw new BadRequestException('Other user ID required');

  const conversations = await this.prisma.conversation.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, displayName: true, image: true } },
      receiver: { select: { id: true, displayName: true, image: true } },
      post: {
        select: {
          id: true,
          text: true,
          images: true,
          caption: true,
          user: { select: { displayName: true, image: true } }
        }
      },
      story: {
        select: {
          id: true,
          caption: true,
          media: true,
          user: { select: { displayName: true, image: true } }
        }
      },
    },
  });

  return conversations.map(conv => ({
    id: conv.id,
    type: conv.type,
    content: conv.content,
    createdAt: conv.createdAt,
    sender: conv.sender,
    receiver: conv.receiver,
    post: conv.post,
    story: conv.story,
  }));
}
}
