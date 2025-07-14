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
    db: {
        path: process.env.DB_PATH,
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
        inference: {
            numSteps: process.env.INFERENCE_NUM_STEPS,
        },
        training: {
            numSteps: process.env.TRAINING_NUM_STEPS,
        },
        runpod: {
            fileSavePodId: process.env.RUNPOD_SAVE_FILE_POD,
            checkStylePodId: process.env.RUNPOD_CHECK_STYLE_POD,
            trainPodId: process.env.RUNPOD_TRAIN_POD,
            inferencePodId: process.env.RUNPOD_INFERENCE_POD,
            apiKey: process.env.RUNPOD_API_KEY,
            baseUrl: process.env.RUNPOD_URL,
            stylePath: process.env.RUNPOD_STYLE_PATH,
        },
        beam: {
            apiKey: process.env.BEAM_API_KEY,
            jobUrl: process.env.BEAM_JOB_URL,
            fileUrl: process.env.BEAM_UPLOAD_URL,
            trainUrl: process.env.BEAM_TRAIN_URL,
            inferenceUrl: process.env.BEAM_INFERENCE_URL,
            stylePath: process.env.BEAM_STYLE_PATH,
        },
    },
};
