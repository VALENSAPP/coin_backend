import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const boostPackages = [
    {
        id: '7a4f6f0d-8d27-4ebf-8f49-c6448b14c8a1',
        name: 'Starter',
        description: 'Estimated reach: 5K - 10K views',
        price: '4.99',
        currency: 'USD',
        durationHours: 72,
        isActive: true,
    },
    {
        id: '2f98966a-d8cb-4c1c-8f6d-7f77ec7fe16f',
        name: 'Growth',
        description: 'Estimated reach: 15K - 30K views',
        price: '8.99',
        currency: 'USD',
        durationHours: 168,
        isActive: true,
    },
    {
        id: 'f3237871-e799-4237-b2b7-1574f7a9f4db',
        name: 'Boost+',
        description: 'Estimated reach: 40K - 60K views',
        price: '19.99',
        currency: 'USD',
        durationHours: 336,
        isActive: true,
    },
] as const;

async function main() {
    const result = await (prisma as any).marketplaceBattleBoostPackage.createMany({
        data: boostPackages,
        skipDuplicates: true,
    });

    console.log(`Marketplace battle boost packages inserted: ${result.count}`);
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
