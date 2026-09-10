import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillPostHits() {
  console.log('🔄 Starting PostHit backfill for old data...');

  const now = new Date();

  // 1. Fetch all existing postHit records
  const allPostHits = await prisma.postHit.findMany({
    include: {
      user: {
        select: {
          id: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          subscriptionEnd: true,
        },
      },
    },
  });

  console.log(`Found ${allPostHits.length} PostHit records in database.`);

  let updatedCount = 0;

  for (const record of allPostHits) {
    const user = record.user;
    const isSubActive =
      user &&
      user.subscriptionStatus === 'ACTIVE' &&
      ((user.currentPeriodEnd && user.currentPeriodEnd > now) ||
        (user.subscriptionEnd && user.subscriptionEnd > now));

    const subExpiry = user?.currentPeriodEnd || user?.subscriptionEnd || null;

    let subHits = 0;
    let purchasedHits = 0;

    if (isSubActive && subExpiry) {
      // User has an active subscription: allocate up to 5 hits as subscriptionHitsLeft with their subscription expiration time
      subHits = Math.min(record.hitLeft, 5);
      purchasedHits = Math.max(0, record.hitLeft - subHits);

      await prisma.postHit.update({
        where: { id: record.id },
        data: {
          subscriptionHitsLeft: subHits,
          subscriptionHitsExpiresAt: subExpiry,
          purchasedHitsLeft: purchasedHits,
          hitLeft: record.hitLeft,
        },
      });
      console.log(
        `✅ Updated active subscriber (User ID: ${record.userId}) -> subscriptionHitsLeft: ${subHits}, subscriptionHitsExpiresAt: ${subExpiry.toISOString()}, purchasedHitsLeft: ${purchasedHits}`,
      );
    } else {
      // User has no active subscription: treat all existing hits as permanent purchased hits
      purchasedHits = record.hitLeft;
      await prisma.postHit.update({
        where: { id: record.id },
        data: {
          subscriptionHitsLeft: 0,
          subscriptionHitsExpiresAt: null,
          purchasedHitsLeft: purchasedHits,
          hitLeft: record.hitLeft,
        },
      });
      console.log(
        `✅ Updated non-subscriber (User ID: ${record.userId}) -> purchasedHitsLeft: ${purchasedHits}, subscriptionHitsExpiresAt: null`,
      );
    }
    updatedCount++;
  }

  // 2. Also check if there are any active subscribers in User table who don't have a PostHit record yet
  const activeUsersWithoutPostHit = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'ACTIVE',
      postHits: { none: {} },
    },
    select: {
      id: true,
      currentPeriodEnd: true,
      subscriptionEnd: true,
    },
  });

  for (const u of activeUsersWithoutPostHit) {
    const subExpiry =
      u.currentPeriodEnd ||
      u.subscriptionEnd ||
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.postHit.create({
      data: {
        userId: u.id,
        subscriptionHitsLeft: 5,
        subscriptionHitsExpiresAt: subExpiry,
        purchasedHitsLeft: 0,
        hitLeft: 5,
      },
    });
    console.log(
      `✅ Created missing PostHit for active subscriber (User ID: ${u.id}) -> 5 hits expiring at ${subExpiry.toISOString()}`,
    );
    updatedCount++;
  }

  console.log(`\n🎉 Backfill successfully completed! Processed ${updatedCount} records.`);
}

backfillPostHits()
  .catch((err) => {
    console.error('❌ Error during backfill:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
