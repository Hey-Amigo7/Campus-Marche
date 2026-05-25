export type ApiEnv = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: number;
  PORT: number;
  NODE_ENV: string;
  CORS_ORIGINS: string;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  AUTH_THROTTLE_TTL: number;
  AUTH_THROTTLE_LIMIT: number;
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_CALLBACK_URL: string;
  FRONTEND_URL: string;
  API_URL: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  CONTACT_EMAIL?: string;
  UPLOAD_DIR?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
};

const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';

function parseNumber(value: string | undefined, fallback: number, name: string): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number, got "${value}"`);
  }
  return parsed;
}

export function validateEnv(config: Record<string, string | undefined>): ApiEnv {
  const databaseUrl = config.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://)');
  }

  const jwtSecret = config.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and contain at least 32 characters');
  }

  return {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: config.JWT_EXPIRES_IN ?? '7d',
    BCRYPT_SALT_ROUNDS: parseNumber(config.BCRYPT_SALT_ROUNDS, 12, 'BCRYPT_SALT_ROUNDS'),
    PORT: parseNumber(config.PORT, 3002, 'PORT'),
    NODE_ENV: config.NODE_ENV ?? 'development',
    CORS_ORIGINS: config.CORS_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS,
    THROTTLE_TTL: parseNumber(config.THROTTLE_TTL, 60000, 'THROTTLE_TTL'),
    THROTTLE_LIMIT: parseNumber(config.THROTTLE_LIMIT, 100, 'THROTTLE_LIMIT'),
    AUTH_THROTTLE_TTL: parseNumber(config.AUTH_THROTTLE_TTL, 60000, 'AUTH_THROTTLE_TTL'),
    AUTH_THROTTLE_LIMIT: parseNumber(config.AUTH_THROTTLE_LIMIT, 5, 'AUTH_THROTTLE_LIMIT'),
    PAYSTACK_SECRET_KEY: config.PAYSTACK_SECRET_KEY,
    PAYSTACK_CALLBACK_URL: config.PAYSTACK_CALLBACK_URL ?? 'http://localhost:3000/orders',
    FRONTEND_URL: config.FRONTEND_URL ?? 'http://localhost:3000',
    API_URL: config.API_URL ?? 'http://localhost:3002',
    SMTP_HOST: config.SMTP_HOST,
    SMTP_PORT: config.SMTP_PORT ? parseNumber(config.SMTP_PORT, 587, 'SMTP_PORT') : undefined,
    SMTP_USER: config.SMTP_USER,
    SMTP_PASS: config.SMTP_PASS,
    SMTP_FROM: config.SMTP_FROM,
    CONTACT_EMAIL: config.CONTACT_EMAIL,
    UPLOAD_DIR: config.UPLOAD_DIR,
    ADMIN_EMAIL: config.ADMIN_EMAIL,
    ADMIN_PASSWORD: config.ADMIN_PASSWORD,
  };
}

export function parseAllowedOrigins(origins: string): string[] {
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
