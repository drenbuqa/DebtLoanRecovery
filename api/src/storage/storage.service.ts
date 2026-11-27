import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private useLocal = false;
  private localDir: string;
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
    this.localDir = process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), 'uploads');
  }

  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    const ext = originalName.split('.').pop() ?? 'bin';
    const key = `hr-documents/${randomUUID()}.${ext}`;

    if (this.useLocal) {
      return this.saveLocal(key, buffer);
    }

    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }));
      return key;
    } catch (e: any) {
      this.logger.error(`S3 upload failed (${e.name}: ${e.message}) — falling back to local disk.`);
      this.useLocal = true;
      return this.saveLocal(key, buffer);
    }
  }

  private saveLocal(key: string, buffer: Buffer): string {
    const filePath = path.join(this.localDir, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    this.logger.log(`Saved locally: ${filePath}`);
    return `local:${key}`;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (key.startsWith('local:')) {
      const localKey = key.slice(6);
      const apiBase = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
      return `${apiBase}/uploads/${localKey}`;
    }
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  /** Returns the absolute path for a local: key, or null if the key is not local. */
  localPath(key: string): string | null {
    if (!key.startsWith('local:')) return null;
    return path.join(this.localDir, key.slice(6));
  }

  async delete(key: string): Promise<void> {
    if (key.startsWith('local:')) {
      const filePath = path.join(this.localDir, key.slice(6));
      try { fs.unlinkSync(filePath); } catch { /* already gone */ }
      return;
    }
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
