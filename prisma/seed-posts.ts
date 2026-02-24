import * as path from 'path';
import * as fs from 'fs';
// Load env first so S3 and Prisma have AWS/DATABASE_URL
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient } from '@prisma/client';
import { uploadBufferToS3 } from '../src/common/s3.util';

const prisma = new PrismaClient();

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MIMETYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function getImageFiles(): string[] {
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(`Images folder not found: ${IMAGES_DIR}`);
  }
  return fs.readdirSync(IMAGES_DIR).filter((f) => {
    const lower = f.toLowerCase();
    return EXTENSIONS.some((ext) => lower.endsWith(ext));
  });
}

function readImageFile(filename: string): { buffer: Buffer; mimetype: string } | null {
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filename).toLowerCase();
  return {
    buffer: fs.readFileSync(filePath),
    mimetype: MIMETYPES[ext] || 'image/jpeg',
  };
}

async function main() {
  // Only non-company seed users (profile = 'user', our seeded users 6–20)
  const users = await prisma.user.findMany({
    where: {
      profile: 'user',
      AND: [
        { email: { startsWith: 'seeduser' } },
        { email: { endsWith: '@example.com' } },
      ],
    },
    select: { id: true, userName: true },
    orderBy: { email: 'asc' },
  });

  if (users.length === 0) {
    throw new Error(
      'No seed users with profile "user" found. Run user seed first: npx prisma db seed',
    );
  }

  const imageFiles = getImageFiles();
  if (imageFiles.length === 0) {
    throw new Error(`No image files found in ${IMAGES_DIR}. Add .jpg, .jpeg, .png or .webp files.`);
  }

  console.log(`Found ${users.length} users (non-company) and ${imageFiles.length} images.`);

  let imageIndex = 0;
  let postCount = 0;

  for (let u = 0; u < users.length; u++) {
    const user = users[u];
    // 2 or 3 posts per user (first 8 users get 3, rest get 2)
    const numPosts = u < 8 ? 3 : 2;

    for (let p = 0; p < numPosts; p++) {
      const filename = imageFiles[imageIndex % imageFiles.length];
      imageIndex += 1;

      const fileData = readImageFile(filename);
      if (!fileData) continue;

      let imageUrl: string;
      try {
        imageUrl = await uploadBufferToS3(
          fileData.buffer,
          filename,
          fileData.mimetype,
          'post-images',
        );
      } catch (err) {
        console.warn(`Skipping post: upload failed for ${filename}:`, (err as Error).message);
        continue;
      }

      const baseName = path.basename(filename, path.extname(filename));
      const text = `Post about ${baseName}`;

      await prisma.post.create({
        data: {
          userId: user.id,
          text,
          images: [imageUrl],
          type: 'normal',
        },
      });

      postCount += 1;
      console.log(`Post ${postCount}: user ${user.userName}, image ${filename} -> S3`);
    }
  }

  console.log(`Post seed complete: ${postCount} posts for ${users.length} users (images from ${IMAGES_DIR}, uploaded to S3).`);
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
