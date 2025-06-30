import * as dotenv from 'dotenv';

dotenv.config({
    path: [
        '.env.local',
        '.env',
    ]
});

export const config = {
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN,
    },
    s3: {
        enabled: process.env.S3_ENABLED === 'true',
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        region: process.env.S3_REGION,
        bucketName: process.env.S3_BUCKET_NAME,
        endpoint: process.env.S3_ENDPOINT,
    },
    modelClient: {
        runpod: {
            fileSaveEndpoint: process.env.RUNPOD_ENDPOINT,
            trainEndpoint: process.env.RUNPOD_TRAIN_POD,
            inferenceEndpoint: process.env.RUNPOD_INFERENCE_POD,
            apiKey: process.env.RUNPOD_API_KEY,
            baseUrl: process.env.RUNPOD_URL,
        },
    },
};
