import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { Express } from 'express';

export async function uploadImageToS3(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  const fileExt = path.extname(file.originalname);
  const key = `${folder}/${uuidv4()}${fileExt}`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: 'public-read', // Removed to support buckets with ACLs disabled
  };
  await s3.putObject(params).promise();
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
} 