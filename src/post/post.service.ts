import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadImageToS3 } from '../common/s3.util';
import { Prisma } from '@prisma/client';
import { profile } from 'console';
import { start } from 'repl';
import { endWith } from 'rxjs';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(userId: string, text?: string, images?: string[], files?: Express.Multer.File[], caption?: string, hashtag?: string[], location?: string, music?: string, link?: string, visibleTo?: string, taggedPeople?: string[], type?: string, raiseAmount?: number, start_time?: Date, end_time?: Date) {
    try {
      if (!userId) throw new BadRequestException('User ID required');

      // Log incoming data for debugging
      console.log('Creating post with data:', {
        userId,
        text,
        imagesCount: images?.length,
        filesCount: files?.length,
        caption,
        hashtag,
        type,
        raiseAmount
      });

      // For crowdfunding posts, check hits and validate required fields
      if (type === 'crowdfunding' || type === 'support') {
        if (!raiseAmount || !start_time || !end_time) {
          throw new BadRequestException('raiseAmount, start_time, and end_time are required for crowdfunding posts');
        }

        const postHit = await this.prisma.postHit.findFirst({
          where: { userId },
        });

        if (!postHit || postHit.hitLeft <= 0) {
          throw new BadRequestException('No hits left to create a post');
        }
      }

      let imageUrls: string[] = images || [];
      
      // Upload files to S3 and collect URLs
      if (files && files.length > 0) {
        try {
          const uploadedUrls = await Promise.all(
            files.map(f => uploadImageToS3(f, 'post-images'))
          );
          imageUrls = imageUrls.concat(uploadedUrls);
        } catch (uploadError) {
          console.error('S3 Upload error:', uploadError);
          throw new BadRequestException('Failed to upload images');
        }
      }

      // Process input data
      const processedData = {
        text: text?.trim() || null,
        caption: caption?.trim() || null,
        location: location?.trim() || null,
        music: music?.trim() || null,
        link: link?.trim() || null,
        visibleTo: visibleTo?.trim() || null,
        hashtag: hashtag?.filter(Boolean) || [],
        taggedPeople: taggedPeople?.filter(Boolean) || [],
        raiseAmount: raiseAmount ? Number(raiseAmount) : null,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null
      };

      // Validate processed data
      if (processedData.raiseAmount && isNaN(processedData.raiseAmount)) {
        throw new BadRequestException('Invalid raiseAmount');
      }
      if (processedData.start_time && isNaN(processedData.start_time.getTime())) {
        throw new BadRequestException('Invalid start_time');
      }
      if (processedData.end_time && isNaN(processedData.end_time.getTime())) {
        throw new BadRequestException('Invalid end_time');
      }

      return await this.prisma.$transaction(async (tx) => {
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
            ...processedData,
            images: imageUrls,
            type,
          },
        });
      }, {
        timeout: 15000 // Increased timeout
      });

    } catch (error) {
      console.error('Create post error:', error);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to create post');
    }
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
            profileStatus: true,
            profile: true,
            tokenBalance: true,
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
    tokenBalance: post.user?.tokenBalance || 0,
    profileStatus: post.user?.profileStatus || null,
    profile: post.user?.profile || null,  
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isSaved: savedSet.has(post.id),
    isLike: likedSet.has(post.id), // ✅ true if viewer liked
    shareCount: post._count.shares,
    isFollow: !!followMap[post.userId],
    type:post.type,
    link:post.link,
    visibleTo: (post as any).visibleTo,
    start_time:post.start_time,
    end_time:post.end_time,
    raiseAmount:post.raiseAmount,
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
          profileStatus: true,
          tokenBalance: true,
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
    tokenBalance: post.user?.tokenBalance || 0,
    profile: post.user?.profile || null,
    profileStatus: post.user?.profileStatus || null,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    shareCount: post._count.shares,
    isSaved: !!saved,   // ✅ true if viewer saved
    isLike: !!liked,    // ✅ true if viewer liked
    isFollow,
    isHide: !!hidden,
    type:post.type,
    link:post.link,
    visibleTo: (post as any).visibleTo,
    start_time:post.start_time,
    end_time:post.end_time,
    raiseAmount:post.raiseAmount,
  };
}


async getAllPost(viewerUserId?: string) {
  const posts = await this.prisma.post.findMany({
    where: { deletedAt: null },
    include: {
      user: {
        select: {
          displayName: true,
          image: true,
          profile: true,
          profileStatus: true,
          tokenBalance: true,
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

  // Shuffle posts randomly for mixed up ordering
  posts.sort(() => Math.random() - 0.5);

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
    tokenBalance: post.user?.tokenBalance || 0,
    profile: post.user?.profile || null,
    profileStatus: post.user?.profileStatus || null,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    shareCount: post._count.shares,
    isSaved: savedSet.has(post.id),
    isLike: likedSet.has(post.id), // ✅ true if viewer liked
    isFollow: !!followMap[post.userId],
    isHide: hiddenSet.has(post.id),
    type:post.type,
    link:post.link,
    visibleTo: (post as any).visibleTo,
    start_time:post.start_time,
    end_time:post.end_time,
    raiseAmount:post.raiseAmount,
  }));
}

async searchAllPost(viewerUserId?: string, search?: string) {
  if (search && search.trim()) {
    // First, search for users by userName or displayName
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { userName: { contains: search.trim(), mode: 'insensitive' } },
          { displayName: { contains: search.trim(), mode: 'insensitive' } },
        ],
        isDeleted: 0,
      },
      select: {
        id: true,
        displayName: true,
        userName: true,
        image: true,
        profile: true,
        profileStatus: true,
        bio: true,
        email: true,
      },
    });

    if (users.length > 0) {
      // If users found, return user details
      return { type: 'users', data: users };
    } else {
      // If no users found, search posts by text field
      const posts = await this.prisma.post.findMany({
        where: {
          text: { contains: search.trim(), mode: 'insensitive' },
          deletedAt: null
        },
        include: {
          user: {
            select: {
              displayName: true,
              image: true,
              profile: true,
              profileStatus: true,
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

      if (!posts || posts.length === 0) {
        return { message: 'No data found' };
      }

      // Shuffle the posts randomly
      const shuffledPosts = posts.sort(() => Math.random() - 0.5);

      // Get additional metadata for posts
      let savedSet: Set<string> = new Set();
      let likedSet: Set<string> = new Set();
      let followMap: Record<string, boolean> = {};
      let hiddenSet: Set<string> = new Set();

      if (viewerUserId) {
        // Fetch saved posts for viewer
        const saved = await this.prisma.savePost.findMany({
          where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
          select: { postId: true },
        });
        savedSet = new Set(saved.map(s => s.postId));

        // Fetch liked posts for viewer
        const liked = await this.prisma.postLike.findMany({
          where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
          select: { postId: true },
        });
        likedSet = new Set(liked.map(l => l.postId));

        // Fetch follow status for each post's author
        const authorIds = Array.from(new Set(shuffledPosts.map(p => p.userId)));
        if (authorIds.length > 0) {
          const follows = await this.prisma.followerAndFollowing.findMany({
            where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
            select: { followingId: true },
          });
          followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {} as Record<string, boolean>);
        }

        // Fetch hidden posts for viewer
        if (shuffledPosts.length > 0) {
          const hidden = await this.prisma.hidePost.findMany({
            where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
            select: { postId: true },
          });
          hiddenSet = new Set(hidden.map(h => h.postId));
        }
      }

      const formattedPosts = shuffledPosts.map(post => ({
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
        profileStatus: post.user?.profileStatus || null,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        shareCount: post._count.shares,
        isSaved: savedSet.has(post.id),
        isLike: likedSet.has(post.id),
        isFollow: !!followMap[post.userId],
        isHide: hiddenSet.has(post.id),
        type: post.type,
         link:post.link,
         visibleTo: (post as any).visibleTo,
      start_time:post.start_time,
      end_time:post.end_time,
      raiseAmount:post.raiseAmount,
      }));

      return { type: 'posts', data: formattedPosts };
    }
  } else {
    // No search query, get all posts
    const posts = await this.prisma.post.findMany({
      where: { deletedAt: null },
      include: {
        user: {
          select: {
            displayName: true,
            image: true,
            profile: true,
            profileStatus: true,
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

    // Shuffle the posts randomly
    const shuffledPosts = posts.sort(() => Math.random() - 0.5);

    let savedSet: Set<string> = new Set();
    let likedSet: Set<string> = new Set();
    let followMap: Record<string, boolean> = {};
    let hiddenSet: Set<string> = new Set();

    if (viewerUserId) {
      // Fetch saved posts for viewer
      const saved = await this.prisma.savePost.findMany({
        where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
        select: { postId: true },
      });
      savedSet = new Set(saved.map(s => s.postId));

      // Fetch liked posts for viewer
      const liked = await this.prisma.postLike.findMany({
        where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
        select: { postId: true },
      });
      likedSet = new Set(liked.map(l => l.postId));

      // Fetch follow status for each post's author
      const authorIds = Array.from(new Set(shuffledPosts.map(p => p.userId)));
      if (authorIds.length > 0) {
        const follows = await this.prisma.followerAndFollowing.findMany({
          where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
          select: { followingId: true },
        });
        followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {} as Record<string, boolean>);
      }

      // Fetch hidden posts for viewer
      if (shuffledPosts.length > 0) {
        const hidden = await this.prisma.hidePost.findMany({
          where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
          select: { postId: true },
        });
        hiddenSet = new Set(hidden.map(h => h.postId));
      }
    }

    return shuffledPosts.map(post => ({
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
      profileStatus: post.user?.profileStatus || null,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      shareCount: post._count.shares,
      isSaved: savedSet.has(post.id),
      isLike: likedSet.has(post.id),
      isFollow: !!followMap[post.userId],
      isHide: hiddenSet.has(post.id),
      type: post.type,
       link:post.link,
       visibleTo: (post as any).visibleTo,
  start_time:post.start_time,
  end_time:post.end_time,
  raiseAmount:post.raiseAmount,
    }));
  }
}

async getAllReel(viewerUserId?: string) {
  const posts = await this.prisma.post.findMany({
    where: {
      deletedAt: null,
      type: 'reel'
    },
    include: {
      user: {
        select: {
          displayName: true,
          image: true,
          profile: true,
          profileStatus: true,
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

  // Shuffle the reel posts randomly
  const shuffledPosts = posts.sort(() => Math.random() - 0.5);

  let savedSet: Set<string> = new Set();
  let likedSet: Set<string> = new Set();
  let followMap: Record<string, boolean> = {};
  let hiddenSet: Set<string> = new Set();

  if (viewerUserId) {
    // Fetch saved posts for viewer
    const saved = await this.prisma.savePost.findMany({
      where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
      select: { postId: true },
    });
    savedSet = new Set(saved.map(s => s.postId));

    // Fetch liked posts for viewer
    const liked = await this.prisma.postLike.findMany({
      where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
      select: { postId: true },
    });
    likedSet = new Set(liked.map(l => l.postId));

    // Fetch follow status for each post's author
    const authorIds = Array.from(new Set(shuffledPosts.map(p => p.userId)));
    if (authorIds.length > 0) {
      const follows = await this.prisma.followerAndFollowing.findMany({
        where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
        select: { followingId: true },
      });
      followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {} as Record<string, boolean>);
    }

    // Fetch hidden posts for viewer
    if (shuffledPosts.length > 0) {
      const hidden = await this.prisma.hidePost.findMany({
        where: { userId: viewerUserId, postId: { in: shuffledPosts.map(p => p.id) } },
        select: { postId: true },
      });
      hiddenSet = new Set(hidden.map(h => h.postId));
    }
  }

  return shuffledPosts.map(post => ({
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
    profileStatus: post.user?.profileStatus || null,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    shareCount: post._count.shares,
    isSaved: savedSet.has(post.id),
    isLike: likedSet.has(post.id),
    isFollow: !!followMap[post.userId],
    isHide: hiddenSet.has(post.id),
    type: post.type,
    visibleTo: (post as any).visibleTo,
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

    // Only update visibleTo if it's provided and not empty string
    if (updateData.visibleTo !== undefined && updateData.visibleTo !== null && updateData.visibleTo.trim() !== '') {
      updateFields.visibleTo = updateData.visibleTo;
    } else if (updateData.visibleTo === '') {
      // If empty string is explicitly sent, set to null
      updateFields.visibleTo = null;
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
              profileStatus: true,
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
      profileStatus: post.user?.profileStatus || null,
      profile: post.user?.profile || null,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      shareCount: post._count.shares,
      isSaved: savedSet.has(post.id),
      isLike: likedSet.has(post.id),
      isFollow: !!(typeof followMap !== 'undefined' && followMap[post.userId]),
      raiseAmount:post.raiseAmount,
      type:post.type,
      link:post.link,
      visibleTo: (post as any).visibleTo,
      start_time:post.start_time,
      end_time:post.end_time,
    };
  });
}

async sharePostToUser(mediaId: string, mediaType: string, conversationType: string, sharedUserId: string, receiverUserId: string) {
  if (!mediaId) throw new BadRequestException('Media ID required');
  if (!mediaType) throw new BadRequestException('Media type required');
  if (!conversationType) throw new BadRequestException('Conversation type required');
  if (!sharedUserId) throw new BadRequestException('Sender user ID required');
  if (!receiverUserId) throw new BadRequestException('Receiver user ID required');

  // Prevent sharing to self
  if (sharedUserId === receiverUserId) {
    throw new BadRequestException('Cannot share media to yourself');
  }

  // Create new ChatBox for this share
  const chatBox = await this.prisma.chatBox.create({
    data: {
      senderId: sharedUserId,
      receiverId: receiverUserId,
    },
  });

  // Check if a share conversation already exists between these two users for this media in this chat
  let conversation = await this.prisma.conversation.findFirst({
    where: {
      chatId: chatBox.id,
      mediaId,
      type: 'MEDIA',
      mediaType: mediaType as any,
    },
  });

  if (conversation) {
    // Already shared, return existing conversation info
    return { message: 'Media already shared between these users', conversationId: conversation.id };
  }

  // Create the conversation record for media share
  conversation = await this.prisma.conversation.create({
    data: {
      type: 'MEDIA',
      senderId: sharedUserId,
      receiverId: receiverUserId,
      mediaId,
      mediaType: mediaType as any,
      chatId: chatBox.id,
    },
  });

  return { message: 'Media shared successfully', conversationId: conversation.id };
}

async getSharedPostList(userId: string) {
  if (!userId) throw new BadRequestException('User ID required');

  const conversations = await this.prisma.conversation.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
      type: 'MEDIA',
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch media data separately based on mediaType
  const mediaIds: string[] = conversations.map(c => c.mediaId).filter((id): id is string => id !== null);
  const posts = await this.prisma.post.findMany({
    where: { id: { in: mediaIds }, deletedAt: null },
    include: {
      user: { select: { displayName: true, image: true, profileStatus: true, profile: true } },
      _count: { select: { likes: true, comments: true, shares: true } },
    },
  });

  const postMap = new Map(posts.map(p => [p.id, p]));

  return conversations.map(conv => {
    const post = conv.mediaId ? postMap.get(conv.mediaId) : null;
    return {
      id: conv.id,
      sharedAt: conv.createdAt,
      mediaType: conv.mediaType,
      post: post && {
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
        profileStatus: post.user?.profileStatus || null,
        profile: post.user?.profile || null,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        shareCount: post._count.shares,
        visibleTo: (post as any).visibleTo,
        type: post.type,
      },
      sharedBy: {
        id: conv.senderId,
        // Note: sender details not fetched, can add if needed
      },
      receivedBy: {
        id: conv.receiverId,
        // Note: receiver details not fetched, can add if needed
      },
    };
  });
}

async deleteSharedPosts(shareIds: string[], userId: string) {
  if (!Array.isArray(shareIds) || shareIds.length === 0) throw new BadRequestException('Share IDs required');
  if (!userId) throw new BadRequestException('User ID required');

  // Find all conversation records for the given IDs
  const conversations = await this.prisma.conversation.findMany({
    where: { id: { in: shareIds }, type: 'MEDIA' },
  });

  // Filter to only those the user is authorized to delete
  const deletableIds = conversations
    .filter(conv => conv.senderId === userId || conv.receiverId === userId)
    .map(conv => conv.id);

  if (deletableIds.length === 0) throw new BadRequestException('No authorized shared posts to delete');

  // Delete all authorized conversation records
  await this.prisma.conversation.deleteMany({
    where: { id: { in: deletableIds }, type: 'MEDIA' },
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
    },
  });

  return conversations.map(conv => ({
    id: conv.id,
    type: conv.type,
    content: conv.content,
    createdAt: conv.createdAt,
    sender: conv.sender,
    receiver: conv.receiver,
    post: null,
    story: null,
  }));
}

async getUserChatBox(userId: string) {
  if (!userId) throw new BadRequestException('User ID required');

  const chatBoxes = await this.prisma.chatBox.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          image: true,
          profile: true,
          profileStatus: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
          image: true,
          profile: true,
          profileStatus: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get conversation details for each chatBox
  const chatBoxIds = chatBoxes.map(cb => cb.id);
  const conversations = await this.prisma.conversation.findMany({
    where: {
      chatId: { in: chatBoxIds },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group conversations by chatId
  const conversationsByChatId = conversations.reduce((acc, conv) => {
    if (!acc[conv.chatId!]) {
      acc[conv.chatId!] = [];
    }
    acc[conv.chatId!].push(conv);
    return acc;
  }, {} as Record<string, any[]>);

  const result = chatBoxes.map(chatBox => {
    const isSender = chatBox.senderId === userId;
    const receiver = isSender ? chatBox.receiver : chatBox.sender;
    const chatConversations = conversationsByChatId[chatBox.id] || [];
    const unreadCount = chatConversations.filter(conv => conv.isSeen === 0).length;
    const lastMessage = chatConversations.length > 0 ? chatConversations[0] : null;

    return {
      id: chatBox.id,
      createdAt: chatBox.createdAt,
      updatedAt: chatBox.updatedAt,
      receiver: receiver,
      unreadCount,
      lastMessage,
      sortKey: lastMessage ? lastMessage.createdAt : chatBox.createdAt,
    };
  });

  // Sort by latest conversation activity (descending)
  result.sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime());

  // Remove sortKey from response
  return result.map(({ sortKey, ...item }) => item);
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
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, displayName: true, image: true } },
      receiver: { select: { id: true, displayName: true, image: true } },
    },
  });

  // Collect media IDs for MEDIA type conversations
  const mediaConversations = conversations.filter(c => c.type === 'MEDIA');
  const postIds = mediaConversations
    .filter(c => c.mediaType === 'POST' || c.mediaType === 'REEL')
    .map(c => c.mediaId)
    .filter(id => id !== null) as string[];
  const storyIds = mediaConversations
    .filter(c => c.mediaType === 'STORY')
    .map(c => c.mediaId)
    .filter(id => id !== null) as string[];

  // Fetch posts with user details
  const posts = postIds.length > 0 ? await this.prisma.post.findMany({
    where: { id: { in: postIds }, deletedAt: null },
    include: {
      user: { select: { id: true, displayName: true, image: true, profile: true } },
    },
  }) : [];

  // Fetch stories with user details
  const stories = storyIds.length > 0 ? await this.prisma.story.findMany({
    where: { id: { in: storyIds } },
    include: {
      user: { select: { id: true, displayName: true, image: true, profile: true } },
    },
  }) : [];

  // Create maps for quick lookup
  const postMap = new Map(posts.map(p => [p.id, p]));
  const storyMap = new Map(stories.map(s => [s.id, s]));

  return conversations.map(conv => {
    let post = null;
    let story = null;

    if (conv.type === 'MEDIA' && conv.mediaId) {
      if (conv.mediaType === 'POST' || conv.mediaType === 'REEL') {
        const p = postMap.get(conv.mediaId);
        if (p) {
          post = {
            id: p.id,
            text: p.text,
            images: p.images,
            caption: p.caption,
            hashtag: p.hashtag,
            location: p.location,
            music: p.music,
            taggedPeople: p.taggedPeople,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            deletedAt: p.deletedAt,
            userId: p.userId,
            userName: p.user.displayName,
            userImage: p.user.image,
            profile: p.user.profile,
            type: p.type,
            link: p.link,
            visibleTo: p.visibleTo,
            start_time: p.start_time,
            end_time: p.end_time,
            raiseAmount: p.raiseAmount,
          };
        }
      } else if (conv.mediaType === 'STORY') {
        const s = storyMap.get(conv.mediaId);
        if (s) {
          story = {
            id: s.id,
            caption: s.caption,
            media: s.media,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            userId: s.userId,
            userName: s.user.displayName,
            userImage: s.user.image,
            profile: s.user.profile,
          };
        }
      }
    }

    return {
      id: conv.id,
      type: conv.type,
      content: conv.content,
      createdAt: conv.createdAt,
      sender: conv.sender,
      receiver: conv.receiver,
      post,
      story,
    };
  });
}

}
