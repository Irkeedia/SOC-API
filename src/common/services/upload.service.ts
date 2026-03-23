import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('R2_BUCKET_NAME', 'soc-uploads');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');

    const accountId = this.config.get<string>('R2_ACCOUNT_ID', '');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /**
   * Upload un fichier vers Cloudflare R2.
   * @param file Buffer du fichier
   * @param folder Dossier (ex: 'dolls', 'profiles')
   * @param mimeType Type MIME
   * @returns URL publique du fichier
   */
  async upload(
    file: Buffer,
    folder: string,
    mimeType: string,
  ): Promise<{ url: string; key: string }> {
    const ext = this.extFromMime(mimeType);
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    return { url, key };
  }

  /**
   * Supprime un fichier de R2 par sa clé.
   */
  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Extrait la clé R2 d'une URL publique.
   */
  keyFromUrl(url: string): string | null {
    if (!this.publicUrl || !url.startsWith(this.publicUrl)) return null;
    return url.replace(`${this.publicUrl}/`, '');
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/heic': 'heic',
      'image/heif': 'heif',
    };
    return map[mime] || 'jpg';
  }

  /**
   * Valide le type MIME d'un fichier image.
   */
  validateImage(mimetype: string, size: number): void {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
    ];
    if (!allowed.includes(mimetype)) {
      throw new BadRequestException(
        `Format non supporté: ${mimetype}. Formats acceptés: JPG, PNG, WebP, GIF, HEIC`,
      );
    }
    const maxSize = this.config.get<number>('UPLOAD_MAX_SIZE_MB', 10) * 1024 * 1024;
    if (size > maxSize) {
      throw new BadRequestException(
        `Fichier trop volumineux (${(size / 1024 / 1024).toFixed(1)} MB). Max: ${maxSize / 1024 / 1024} MB`,
      );
    }
  }
}
