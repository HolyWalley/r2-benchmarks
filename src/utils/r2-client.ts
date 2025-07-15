import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { R2Config } from '../types';

export class R2Client {
  private client: S3Client;
  private bucketName: string;

  constructor(config: R2Config) {
    this.bucketName = config.bucketName;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async putObject(key: string, body: Buffer | Uint8Array | string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
    });
    await this.client.send(command);
  }

  async putObjectWithIfMatch(key: string, body: Buffer | Uint8Array | string, ifMatch: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      IfMatch: ifMatch,
    });
    await this.client.send(command);
  }

  async putObjectMultipart(key: string, body: Buffer | Uint8Array | string): Promise<void> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
      },
    });
    await upload.done();
  }

  async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.client.send(command);
    
    if (!response.Body) {
      throw new Error('No body in response');
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  async getObjectWithETag(key: string): Promise<{ body: Buffer; etag: string }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error('No body in response');
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return {
      body: Buffer.concat(chunks),
      etag: response.ETag || ''
    };
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.client.send(command);
  }

  async listObjects(prefix?: string, maxKeys?: number): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });
    const response = await this.client.send(command);
    return response.Contents?.map(obj => obj.Key!).filter(Boolean) || [];
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  generateTestData(size: number): Buffer {
    return Buffer.alloc(size, 'a');
  }

  generateRandomKey(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTestJson(id: number): string {
    return JSON.stringify({
      id,
      timestamp: new Date().toISOString(),
      data: `test-data-${id}`,
      metadata: {
        version: 1,
        created: Date.now()
      }
    });
  }
}
