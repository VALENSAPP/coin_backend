import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HASHTAG_REGEX = /(^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,50})/g;
const MAX_HASHTAGS_PER_POST = 10;

function normalizeHashtagTag(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const value = String(raw).trim();
    if (!value) return null;

    const withoutHash = value.replace(/^#+/, '');
    const normalized = withoutHash.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!normalized) return null;

    return normalized.slice(0, 50);
}

function extractHashtagsFromText(input?: string | null): string[] {
    if (!input || typeof input !== 'string') return [];
    const tags: string[] = [];

    for (const match of input.matchAll(HASHTAG_REGEX)) {
        const normalized = normalizeHashtagTag(match[2]);
        if (normalized) tags.push(normalized);
    }

    return tags;
}

function buildNormalizedPostHashtags(hashtag?: string[], text?: string | null, caption?: string | null): string[] {
    const sourceTags: string[] = [
        ...(Array.isArray(hashtag) ? hashtag.map((item) => String(item)) : []),
        ...extractHashtagsFromText(text),
        ...extractHashtagsFromText(caption),
    ];

    const uniqueTags: string[] = [];
    const seen = new Set<string>();

    for (const rawTag of sourceTags) {
        const normalized = normalizeHashtagTag(rawTag);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        uniqueTags.push(normalized);

        if (uniqueTags.length >= MAX_HASHTAGS_PER_POST) {
            break;
        }
    }

    return uniqueTags;
}

async function recalculateHashtagCounters(hashtagId: string) {
    const [postCount, lastLink] = await Promise.all([
        prisma.postHashtag.count({ where: { hashtagId } }),
        prisma.postHashtag.findFirst({
            where: { hashtagId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        }),
    ]);

    if (postCount === 0) {
        await prisma.hashtag.delete({ where: { id: hashtagId } }).catch(() => undefined);
        return;
    }

    await prisma.hashtag.update({
        where: { id: hashtagId },
        data: {
            usageCount: postCount,
            postCount,
            lastUsedAt: lastLink?.createdAt || new Date(),
        },
    });
}

async function run() {
    const posts = await prisma.post.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            text: true,
            caption: true,
            hashtag: true,
        },
    });

    for (const post of posts) {
        const tags = buildNormalizedPostHashtags(post.hashtag || [], post.text, post.caption);

        await prisma.$transaction(async (tx) => {
            await tx.post.update({ where: { id: post.id }, data: { hashtag: tags } });
            await tx.postHashtag.deleteMany({ where: { postId: post.id } });

            if (tags.length === 0) return;

            const upserted = await Promise.all(
                tags.map((tag) =>
                    tx.hashtag.upsert({
                        where: { tag },
                        update: { lastUsedAt: new Date() },
                        create: { tag, lastUsedAt: new Date() },
                        select: { id: true },
                    }),
                ),
            );

            await tx.postHashtag.createMany({
                data: upserted.map((item) => ({ postId: post.id, hashtagId: item.id })),
                skipDuplicates: true,
            });
        });
    }

    const hashtags = await prisma.hashtag.findMany({ select: { id: true } });
    for (const hashtag of hashtags) {
        await recalculateHashtagCounters(hashtag.id);
    }

    console.log(`Backfill complete. Processed posts: ${posts.length}`);
}

run()
    .catch((error) => {
        console.error('Backfill failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
