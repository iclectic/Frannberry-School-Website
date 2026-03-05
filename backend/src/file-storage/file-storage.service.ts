import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as Minio from 'minio';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const endpoint = new URL(this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000'));
    this.client = new Minio.Client({
      endPoint: endpoint.hostname,
      port: parseInt(endpoint.port, 10) || 9000,
      useSSL: endpoint.protocol === 'https:',
      accessKey: this.config.get<string>('S3_ACCESS_KEY', 'frannberry_minio'),
      secretKey: this.config.get<string>('S3_SECRET_KEY', 'frannberry_minio_secret'),
    });
    this.bucket = this.config.get<string>('S3_BUCKET', 'frannberry-files');
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }
  }

  async upload(file: Express.Multer.File, folder: string): Promise<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }> {
    const key = `${folder}/${Date.now()}-${file.originalname}`;
    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const fileUrl = `${this.config.get<string>('S3_ENDPOINT')}/${this.bucket}/${key}`;

    return {
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async createAttachment(
    uploadResult: { fileUrl: string; fileName: string; fileSize: number; mimeType: string },
    linkTo: { resultId?: string; assignmentId?: string; submissionId?: string; messageId?: string },
  ) {
    return this.prisma.fileAttachment.create({
      data: {
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        ...linkTo,
      },
    });
  }
}
