import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const promotionPackages = [
    {
        id: '1a2b3c4d-8d27-4ebf-8f49-c6448b14c801',
        name: '10% Off for 24 Hours',
        description: '10% discount on the winning product for 24 hours',
        price: '4.99',
        currency: 'USD',
        durationHours: 24,
        isActive: true,
    },
    {
        id: '2a2b3c4d-d8cb-4c1c-8f6d-7f77ec7fe102',
        name: 'Free Shipping',
        description: 'Free shipping on the winning product',
        price: '8.99',
        currency: 'USD',
        durationHours: 24,
        isActive: true,
    },
] as const;

async function main() {
    for (const pkg of promotionPackages) {
        await (prisma as any).marketplaceWinnerPromotionPackage.upsert({
            where: { id: pkg.id },
            update: {
                name: pkg.name,
                description: pkg.description,
                price: pkg.price,
                currency: pkg.currency,
                durationHours: pkg.durationHours,
                isActive: pkg.isActive,
            },
            create: {
                id: pkg.id,
                name: pkg.name,
                description: pkg.description,
                price: pkg.price,
                currency: pkg.currency,
                durationHours: pkg.durationHours,
                isActive: pkg.isActive,
            },
        });
    }

    // Deactivate any other legacy packages
    await (prisma as any).marketplaceWinnerPromotionPackage.updateMany({
        where: {
            id: { notIn: promotionPackages.map((p) => p.id) },
        },
        data: { isActive: false },
    });

    console.log(`Marketplace winner promotion packages synced: ${promotionPackages.length}`);
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
