"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageToS3 = uploadImageToS3;
const AWS = require("aws-sdk");
const uuid_1 = require("uuid");
const path = require("path");
async function uploadImageToS3(file, folder = 'uploads') {
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    });
    const fileExt = path.extname(file.originalname);
    const key = `${folder}/${(0, uuid_1.v4)()}${fileExt}`;
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };
    await s3.putObject(params).promise();
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
//# sourceMappingURL=s3.util.js.map