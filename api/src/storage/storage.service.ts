import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private bucketReady = false;
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    this.s3 = new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION ?? 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
    this.bucket = process.env.S3_BUCKET ?? 'dlr-documents';
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketReady = true;
    } catch (e: any) {
      if (e.$metadata?.httpStatusCode === 404 || e.name === 'NoSuchBucket' || e.Code === 'NoSuchBucket') {
        this.logger.log(`Bucket "${this.bucket}" not found, creating it…`);
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.bucketReady = true;
        this.logger.log(`Bucket "${this.bucket}" created.`);
      } else {
        throw e;
      }
    }
  }

  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    await this.ensureBucket();
    const ext = originalName.split('.').pop() ?? 'bin';
    const key = `hr-documents/${randomUUID()}.${ext}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }));
    return key;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
