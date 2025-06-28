import * as AWS from 'aws-sdk';
import { config } from '../config';

class S3Client {
    private s3: AWS.S3;
    private bucketName: string;

    constructor() {
        if (!config.s3.accessKeyId || !config.s3.secretAccessKey || !config.s3.region || !config.s3.bucketName) {
            throw new Error('S3 credentials are not configured in .env file');
        }

        const options: AWS.S3.Types.ClientConfiguration = {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
            region: config.s3.region,
        };

        if (config.s3.endpoint) {
            options.endpoint = config.s3.endpoint;
        }

        this.s3 = new AWS.S3(options);
        this.bucketName = config.s3.bucketName;
    }

    public async save(fileName: string, content: Buffer): Promise<string> {
        const params = {
            Bucket: this.bucketName,
            Key: fileName,
            Body: content,
        };

        const { Location } = await this.s3.upload(params).promise();
        return Location;
    }

    public async load(fileName: string): Promise<Buffer> {
        const params = {
            Bucket: this.bucketName,
            Key: fileName,
        };

        const { Body } = await this.s3.getObject(params).promise();
        return Body as Buffer;
    }
}

export const s3Client = new S3Client();
