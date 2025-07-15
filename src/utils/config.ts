import { config as dotenvConfig } from 'dotenv';
import { R2Config } from '../types';

dotenvConfig();

export function loadR2Config(): R2Config {
  const requiredEnvVars = [
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please copy .env.example to .env and fill in your R2 credentials.');
  }

  return {
    endpoint: process.env.R2_ENDPOINT!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME!,
    region: process.env.R2_REGION || 'auto'
  };
}

export function loadWorkerUrl(): string | undefined {
  return process.env.WORKER_URL;
}

export function validateR2Config(config: R2Config): void {
  if (!config.endpoint.startsWith('https://')) {
    throw new Error('R2_ENDPOINT must start with https://');
  }
  
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required');
  }
  
  if (!config.bucketName) {
    throw new Error('R2_BUCKET_NAME is required');
  }
}