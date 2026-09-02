import {
  BadRequestException,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { memoryStorage } from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE   = 5  * 1024 * 1024; // 5 MB

const MEDIA_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/m4a',
  'audio/aac', 'audio/flac', 'audio/x-m4a',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed',
];
const MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25 MB

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  private readonly supabase: SupabaseClient | null;

  constructor(private config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = url && key ? createClient(url, key) : null;
    const isProd = config.get<string>('NODE_ENV') === 'production';
    if (!this.supabase && isProd) {
      this.logger.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in production — image uploads will fail');
    } else if (!this.supabase) {
      this.logger.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — falling back to local disk storage');
    }
  }

  private apiUrl() {
    return this.config.get<string>('API_URL') ?? 'http://localhost:3002';
  }

  // Upload a buffer to Supabase Storage and return the public URL
  private async uploadToSupabase(bucket: string, filename: string, buffer: Buffer, mimetype: string): Promise<string> {
    if (!this.supabase) throw new Error('Supabase not configured');

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filename, buffer, { contentType: mimetype, upsert: false });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
  }

  // Fallback: save to local disk and serve via /uploads static route
  private saveLocally(buffer: Buffer, filename: string, subdir = ''): string {
    const uploadDir = join(process.cwd(), 'uploads', subdir);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    writeFileSync(join(uploadDir, filename), buffer);
    const path = subdir ? `uploads/${subdir}/${filename}` : `uploads/${filename}`;
    return `${this.apiUrl()}/${path}`;
  }

  // ── Product images ──────────────────────────────────────────────────────────

  @Post('image')
  @ApiOperation({ summary: 'Upload a product image (max 5 MB, JPEG/PNG/WebP/GIF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const filename = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;

    let url: string;
    try {
      if (this.supabase) {
        url = await this.uploadToSupabase('product-images', filename, file.buffer, file.mimetype);
      } else if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new Error('Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.');
      } else {
        url = this.saveLocally(file.buffer, filename);
      }
    } catch (err) {
      this.logger.error(`Image upload failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new InternalServerErrorException('Image upload failed. Please try again.');
    }

    return { url, filename, size: file.size, mimetype: file.mimetype };
  }

  // ── Message media (images + audio + documents) ──────────────────────────────

  @Post('message-media')
  @ApiOperation({ summary: 'Upload message media: images, audio, or documents (max 25 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_MEDIA_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!MEDIA_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('File type not supported'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadMessageMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const filename = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;

    let url: string;
    try {
      if (this.supabase) {
        url = await this.uploadToSupabase('message-media', filename, file.buffer, file.mimetype);
      } else if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new Error('Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.');
      } else {
        url = this.saveLocally(file.buffer, filename, 'messages');
      }
    } catch (err) {
      this.logger.error(`Media upload failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new InternalServerErrorException('Media upload failed. Please try again.');
    }

    return { url, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype };
  }
}
