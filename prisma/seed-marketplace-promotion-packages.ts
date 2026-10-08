import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const promotionPackages = [
    {
        id: '1a2b3c4d-8d27-4ebf-8f49-c6448b14c801',
        name: '10% Off (or more) - 24 Hours',
        description: 'DISCOUNT_10_PERCENT_24H',
        price: '4.99',
        currency: 'USD',
        durationHours: 24,
        isActive: true,
    },
    {
        id: '2a2b3c4d-d8cb-4c1c-8f6d-7f77ec7fe102',
        name: '10% Off (or more) - 3 Days',
        description: 'DISCOUNT_10_PERCENT_72H',
        price: '8.99',
        currency: 'USD',
        durationHours: 72,
        isActive: true,
    },
    {
        id: '3a2b3c4d-e799-4237-b2b7-1574f7a9f403',
        name: '10% Off (or more) - 7 Days',
        description: 'DISCOUNT_10_PERCENT_168H',
        price: '19.99',
        currency: 'USD',
        durationHours: 168,
        isActive: true,
    },
    {
        id: '4a2b3c4d-45dc-4fb6-8abf-4b7f2ab9f104',
        name: 'Free Shipping - 24 Hours',
        description: 'FREE_SHIPPING_24H',
        price: '4.99',
        currency: 'USD',
        durationHours: 24,
        isActive: true,
    },
    {
        id: '5a2b3c4d-c53d-4f31-ab70-7690d1212105',
        name: 'Free Shipping - 3 Days',
        description: 'FREE_SHIPPING_72H',
        price: '8.99',
        currency: 'USD',
        durationHours: 72,
        isActive: true,
    },
    {
        id: '6a2b3c4d-f62e-4a99-b1d5-2e88dc92a106',
        name: 'Free Shipping - 7 Days',
        description: 'FREE_SHIPPING_168H',
        price: '19.99',
        currency: 'USD',
        durationHours: 168,
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
