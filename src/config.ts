import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN,
    },
    s3: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        region: process.env.S3_REGION,
        bucketName: process.env.S3_BUCKET_NAME,
        endpoint: process.env.S3_ENDPOINT,
    },
};
