import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('crawler-service');

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    private bucket: string;

    constructor() {
        this.s3Client = new S3Client({
            endpoint: process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT || 'http://localhost:9000',
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || 'minioadmin',
            },
            forcePathStyle: true, // Required for MinIO and some S3-compatible providers
        });
        this.bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || 'protecliter-evidence';
    }

    async uploadContent(
        content: Buffer | string,
        key: string,
        contentType: string,
    ): Promise<{ path: string; sha256: string; size: number }> {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        const sha256 = createHash('sha256').update(buffer).digest('hex');

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                Metadata: {
                    sha256,
                },
            }),
        );

        logger.debug(`Uploaded to S3: ${key} (${buffer.length} bytes)`);

        return {
            path: `s3://${this.bucket}/${key}`,
            sha256,
            size: buffer.length,
        };
    }

    async uploadEvidence(
        tenantId: string,
        jobId: string,
        url: string,
        content: Buffer | string,
        contentType: string,
    ): Promise<{ path: string; sha256: string; size: number }> {
        const timestamp = Date.now();
        const urlHash = createHash('md5').update(url).digest('hex').slice(0, 8);
        const key = `evidence/${tenantId}/${jobId}/${timestamp}-${urlHash}`;

        return this.uploadContent(content, key, contentType);
    }

    async uploadScreenshot(
        tenantId: string,
        jobId: string,
        url: string,
        screenshot: Buffer,
    ): Promise<string> {
        const timestamp = Date.now();
        const urlHash = createHash('md5').update(url).digest('hex').slice(0, 8);
        const key = `screenshots/${tenantId}/${jobId}/${timestamp}-${urlHash}.png`;

        await this.uploadContent(screenshot, key, 'image/png');

        return `s3://${this.bucket}/${key}`;
    }

    async getContent(key: string): Promise<Buffer> {
        const response = await this.s3Client.send(
            new GetObjectCommand({
                Bucket: this.bucket,
                Key: key.replace(`s3://${this.bucket}/`, ''),
            }),
        );

        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as any) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);
    }
}
