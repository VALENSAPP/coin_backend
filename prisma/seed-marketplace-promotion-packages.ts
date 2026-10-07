import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const promotionPackages = [
    {
        id: '1a2b3c4d-8d27-4ebf-8f49-c6448b14c801',
        name: 'Starter',
        description: 'Estimated reach: 5K - 10K views',
        price: '4.99',
        currency: 'USD',
        durationHours: 72,
        isActive: true,
    },
    {
        id: '2a2b3c4d-d8cb-4c1c-8f6d-7f77ec7fe102',
        name: 'Growth',
        description: 'Estimated reach: 15K - 30K views',
        price: '8.99',
        currency: 'USD',
        durationHours: 168,
        isActive: true,
    },
    {
        id: '3a2b3c4d-e799-4237-b2b7-1574f7a9f403',
        name: 'Promo+',
        description: 'Estimated reach: 40K - 60K views',
        price: '19.99',
        currency: 'USD',
        durationHours: 336,
        isActive: true,
    },
] as const;

async function main() {
    const result = await (prisma as any).marketplaceWinnerPromotionPackage.createMany({
        data: promotionPackages,
        skipDuplicates: true,
    });

    console.log(`Marketplace winner promotion packages inserted: ${result.count}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
