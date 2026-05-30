import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE   = 5  * 1024 * 1024;  // 5 MB

const MEDIA_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  // Audio
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/m4a',
  'audio/aac', 'audio/flac', 'audio/x-m4a',
  // Documents
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

function resolveUploadDir(subdir = ''): string {
  const base = join(process.cwd(), 'uploads', subdir);
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return base;
}

function makeStorage(subdir = '') {
  return diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, resolveUploadDir(subdir));
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private config: ConfigService) {}

  private apiUrl() {
    return this.config.get<string>('API_URL') ?? 'http://localhost:3002';
  }

  // ── Product images ──────────────────────────────────────────────────────────

  @Post('image')
  @ApiOperation({ summary: 'Upload a product image (max 5 MB, JPEG/PNG/WebP/GIF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
          return;
        }
        cb(null, true);
      },
      storage: makeStorage(),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return {
      url:      `${this.apiUrl()}/uploads/${file.filename}`,
      filename: file.filename,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }

  // ── Message media (images + audio + documents) ──────────────────────────────

  @Post('message-media')
  @ApiOperation({ summary: 'Upload message media: images, audio, or documents (max 25 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_MEDIA_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!MEDIA_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('File type not supported'), false);
          return;
        }
        cb(null, true);
      },
      storage: makeStorage('messages'),
    }),
  )
  uploadMessageMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return {
      url:      `${this.apiUrl()}/uploads/messages/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }
}
