import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

const s3Config: {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
} = {
  region: env.AWS_REGION,
};

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

export const s3Client = new S3Client(s3Config);
