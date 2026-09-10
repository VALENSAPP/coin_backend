import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting battle winner audit and cleanup...');

  const allBattles = await prisma.battle.findMany({
    include: {
      predictions: true,
      participants: true,
      votes: true,
    },
  });

  console.log(`Found ${allBattles.length} total battle(s) in database.`);

  let fixedCount = 0;

  for (const battle of allBattles) {
    console.log(`\nChecking Battle: ${battle.id} | Status: ${battle.status} | Type: ${battle.battleType} | Winner: ${battle.winnerUserId} | WinningSide: ${battle.winningSide} | CorrectSide: ${battle.correctSide}`);

    const winningSide = (battle.winningSide || battle.correctSide || '').trim().toLowerCase();

    if (battle.battleType === 'PREDICTION') {
      const winningPredictions = battle.predictions.filter(
        (p) => (p.side || '').trim().toLowerCase() === winningSide,
      );

      console.log(`- Predictions count: ${battle.predictions.length} | Winning predictions count: ${winningPredictions.length}`);

      if (winningPredictions.length === 0) {
        // No participant picked the winning side!
        if (battle.winnerUserId !== null) {
          console.log(
            `-> FIXING Battle [${battle.id}]: Resetting winnerUserId from '${battle.winnerUserId}' to null (no one predicted '${battle.winningSide}').`,
          );

          await prisma.$transaction([
            prisma.battle.update({
              where: { id: battle.id },
              data: { winnerUserId: null },
            }),
            prisma.battleParticipant.updateMany({
              where: { battleId: battle.id },
              data: { isWinner: false },
            }),
            prisma.battleReward.deleteMany({
              where: { battleId: battle.id },
            }),
          ]);

          fixedCount += 1;
        }
      } else {
        // There are valid winning predictions
        const winningUserIds = new Set(winningPredictions.map((p) => p.userId));

        if (battle.winnerUserId && !winningUserIds.has(battle.winnerUserId)) {
          // Current winner did not pick the winning side!
          const validParticipants = battle.participants.filter((p) => winningUserIds.has(p.userId));
          validParticipants.sort((a, b) => b.score - a.score);
          const newWinnerUserId = validParticipants[0]?.userId || winningPredictions[0].userId;

          console.log(
            `-> FIXING Battle [${battle.id}]: Changing winnerUserId from '${battle.winnerUserId}' to '${newWinnerUserId}'.`,
          );

          await prisma.$transaction([
            prisma.battle.update({
              where: { id: battle.id },
              data: { winnerUserId: newWinnerUserId },
            }),
            prisma.battleParticipant.updateMany({
              where: { battleId: battle.id },
              data: { isWinner: false },
            }),
            prisma.battleParticipant.updateMany({
              where: { battleId: battle.id, userId: newWinnerUserId },
              data: { isWinner: true },
            }),
          ]);

          fixedCount += 1;
        }
      }
    }
  }

  console.log(`\nAudit complete! Fixed ${fixedCount} battle(s).`);
}

main()
  .catch((e) => {
    console.error('Error running cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

