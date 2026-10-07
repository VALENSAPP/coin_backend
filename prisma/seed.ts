import * as path from 'path';
import * as fs from 'fs';
// Load env first so S3 and Prisma have AWS/DATABASE_URL
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { uploadBufferToS3 } from '../src/common/s3.util';

const prisma = new PrismaClient();

const USERIMAGE_DIR = path.join(__dirname, '..', 'userImage');
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MIMETYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function findAndReadUserImage(userIndex: number): { buffer: Buffer; mimetype: string; originalname: string } | null {
  const baseName = `user${userIndex}`;
  for (const ext of EXTENSIONS) {
    const filePath = path.join(USERIMAGE_DIR, baseName + ext);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return {
        buffer,
        mimetype: MIMETYPES[ext],
        originalname: baseName + ext,
      };
    }
  }
  return null;
}

async function main() {
  const defaultPassword = await bcrypt.hash('SeedPassword123!', 10);

  for (let i = 1; i <= 20; i++) {
    const isCompany = i <= 5;
    const email = `seeduser${i}@example.com`;
    const displayName = `Seed User ${i}`;
    const userName = `seeduser${i}`;
    const profile = isCompany ? 'company' : 'user';

    let image: string | null = null;
    const fileData = findAndReadUserImage(i);
    if (fileData) {
      try {
        image = await uploadBufferToS3(
          fileData.buffer,
          fileData.originalname,
          fileData.mimetype,
          'profile-images',
        );
      } catch (err) {
        console.warn(`Could not upload image for user ${i}:`, (err as Error).message);
      }
    } else {
      console.warn(`No image file found for user ${i} in ${USERIMAGE_DIR} (tried user${i}.jpg/.jpeg/.png/.webp)`);
    }

    await prisma.user.upsert({
      where: { email },
      update: {
        displayName,
        userName,
        profile,
        image,
        password: defaultPassword,
        kyc: true,
      },
      create: {
        email,
        password: defaultPassword,
        displayName,
        userName,
        profile,
        image,
        registrationType: 'NORMAL',
        verifyEmail: 1,
        kyc: true,
      },
    });
    // console.log(`Seeded user ${i}: ${email} (profile: ${profile}, image: ${image ? 'S3 URL' : 'none'})`);
  }

  const devBoostPackages = [
    {
      id: '9f91b8e1-45dc-4fb6-8abf-4b7f2ab9f101',
      name: 'DEV Boost 6h',
      description: 'Development/test package. Configure price via env for non-production usage.',
      price: process.env.DEV_MARKETPLACE_BOOST_PRICE_6H || '4.99',
      currency: (process.env.DEV_MARKETPLACE_BOOST_CURRENCY || 'USD').toUpperCase(),
      durationHours: 6,
      isActive: true,
    },
    {
      id: 'cb57ecf5-c53d-4f31-ab70-7690d1212102',
      name: 'DEV Boost 24h',
      description: 'Development/test package. Configure price via env for non-production usage.',
      price: process.env.DEV_MARKETPLACE_BOOST_PRICE_24H || '12.99',
      currency: (process.env.DEV_MARKETPLACE_BOOST_CURRENCY || 'USD').toUpperCase(),
      durationHours: 24,
      isActive: true,
    },
  ];

  for (const pkg of devBoostPackages) {
    await (prisma as any).marketplaceBattleBoostPackage.upsert({
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

  const devPromoPackages = [
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
  ];

  for (const pkg of devPromoPackages) {
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

  // console.log('Seeding complete: 20 users (5 profile "company", 15 profile "user"), images uploaded to S3.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
