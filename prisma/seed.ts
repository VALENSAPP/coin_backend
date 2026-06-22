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
