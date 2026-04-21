import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import * as sharp from 'sharp';
import ffmpeg = require('fluent-ffmpeg');
import { Express } from 'express';
const ffmpegStatic = require('ffmpeg-static');

type GeneratedThumbnail = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

const resolvedFfmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath);
}

function getTempPaths(file: Express.Multer.File) {
  const ext = path.extname(file.originalname) || '.mp4';
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `valens-${id}${ext}`);
  const outputPath = path.join(os.tmpdir(), `valens-${id}.jpg`);
  return { inputPath, outputPath };
}

async function generateImageThumbnail(file: Express.Multer.File): Promise<GeneratedThumbnail> {
  const thumbnailBuffer = await sharp(file.buffer)
    .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  return {
    buffer: thumbnailBuffer,
    originalname: `${path.parse(file.originalname).name}.jpg`,
    mimetype: 'image/jpeg',
  };
}

async function generateVideoThumbnail(file: Express.Multer.File): Promise<GeneratedThumbnail> {
  const { inputPath, outputPath } = getTempPaths(file);
  await fs.writeFile(inputPath, file.buffer);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(0.5)
        .outputOptions(['-frames:v 1'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (error) => reject(error))
        .run();
    });

    const outputBuffer = await fs.readFile(outputPath);
    return {
      buffer: outputBuffer,
      originalname: `${path.parse(file.originalname).name}.jpg`,
      mimetype: 'image/jpeg',
    };
  } finally {
    await fs.unlink(inputPath).catch(() => undefined);
    await fs.unlink(outputPath).catch(() => undefined);
  }
}

export async function generateThumbnailForMedia(file: Express.Multer.File): Promise<GeneratedThumbnail> {
  if (!file?.mimetype) {
    throw new Error('Invalid media file');
  }

  if (file.mimetype.startsWith('image/')) {
    return generateImageThumbnail(file);
  }

  if (file.mimetype.startsWith('video/')) {
    return generateVideoThumbnail(file);
  }

  throw new Error(`Unsupported media type: ${file.mimetype}`);
}
