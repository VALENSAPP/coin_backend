import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillConversationOwnerId() {
  console.log('🔄 Starting backfill for Conversation ownerId...');

  // 1. Fetch all MEDIA type conversations where ownerId is null and mediaId exists
  const conversations = await prisma.conversation.findMany({
    where: {
      type: 'MEDIA',
      mediaId: { not: null },
      ownerId: null,
    },
    select: {
      id: true,
      mediaId: true,
      mediaType: true,
    },
  });

  console.log(`Found ${conversations.length} conversation records with missing ownerId.`);

  if (conversations.length === 0) {
    console.log('✅ All conversation records already have ownerId populated.');
    await prisma.$disconnect();
    return;
  }

  // Group media IDs by type
  const postIds = conversations
    .filter((c) => c.mediaType === 'POST' || c.mediaType === 'REEL' || !c.mediaType)
    .map((c) => c.mediaId as string);

  const storyIds = conversations
    .filter((c) => c.mediaType === 'STORY')
    .map((c) => c.mediaId as string);

  const highlightIds = conversations
    .filter((c) => c.mediaType === 'HIGHLIGHT')
    .map((c) => c.mediaId as string);

  // Fetch owners in bulk
  const [posts, stories, highlights] = await Promise.all([
    postIds.length > 0
      ? prisma.post.findMany({
          where: { id: { in: postIds } },
          select: { id: true, userId: true },
        })
      : [],
    storyIds.length > 0
      ? prisma.story.findMany({
          where: { id: { in: storyIds } },
          select: { id: true, userId: true },
        })
      : [],
    highlightIds.length > 0
      ? prisma.storyHighlight.findMany({
          where: { id: { in: highlightIds } },
          select: { id: true, userId: true },
        })
      : [],
  ]);

  const postOwnerMap = new Map(posts.map((p) => [p.id, p.userId]));
  const storyOwnerMap = new Map(stories.map((s) => [s.id, s.userId]));
  const highlightOwnerMap = new Map(highlights.map((h) => [h.id, h.userId]));

  let updatedCount = 0;
  let skippedCount = 0;

  for (const conv of conversations) {
    if (!conv.mediaId) continue;

    let ownerId: string | undefined;

    if (conv.mediaType === 'STORY') {
      ownerId = storyOwnerMap.get(conv.mediaId);
    } else if (conv.mediaType === 'HIGHLIGHT') {
      ownerId = highlightOwnerMap.get(conv.mediaId);
    } else {
      // POST, REEL, or default
      ownerId = postOwnerMap.get(conv.mediaId);
    }

    if (ownerId) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { ownerId },
      });
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`✅ Backfill complete! Updated: ${updatedCount}, Skipped: ${skippedCount}`);
  await prisma.$disconnect();
}

backfillConversationOwnerId().catch(async (e) => {
  console.error('❌ Error during backfill:', e);
  await prisma.$disconnect();
  process.exit(1);
});
