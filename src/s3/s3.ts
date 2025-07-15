import * as AWS from 'aws-sdk';
import {config} from '../config';
import {randomUUID} from "node:crypto";

class S3Client {
    private readonly s3: AWS.S3 | null = null;
    private readonly bucketName: string = '';
    private readonly enabled: boolean = true;

    constructor() {
        if (!config.s3.enabled) {
            this.enabled = false;
            return
        }

        if (!config.s3.accessKeyId || !config.s3.secretAccessKey || !config.s3.region || !config.s3.bucketName) {
            throw new Error('S3 credentials are not configured in .env file');
        }

        const options: AWS.S3.Types.ClientConfiguration = {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
            region: config.s3.region,
            endpoint: config.s3.endpoint,
            s3ForcePathStyle: true,
        };

        if (config.s3.endpoint) {
            options.endpoint = config.s3.endpoint;
        }

        this.s3 = new AWS.S3(options);
        this.bucketName = config.s3.bucketName;
    }

    public async save(fileName: string, content: Buffer): Promise<string> {
        if (!this.enabled || !this.s3) {
            console.error('S3 is not enabled or not properly initialized');
            return randomUUID();
        }

        const params = {
            Bucket: this.bucketName,
            Key: fileName,
            Body: content,
        };

        const { Location } = await this.s3.upload(params).promise();
        return Location;
    }

    public async load(fileName: string): Promise<Buffer> {
        if (!this.enabled || !this.s3) {
            console.error('S3 is not enabled or not properly initialized');
            return Buffer.from('');
        }

        const params = {
            Bucket: this.bucketName,
            Key: fileName,
        };

        const { Body } = await this.s3.getObject(params).promise();
        if (!Body) {
            throw new Error('No content returned from S3');
        }
        return Body as Buffer;
    }

    public async delete(fileName: string): Promise<void> {
        if (!this.enabled || !this.s3) {
            console.error('S3 is not enabled or not properly initialized');
            return;
        }

        const params = {
            Bucket: this.bucketName,
            Key: fileName,
        };

        await this.s3.deleteObject(params).promise();
    }
}

export const s3Client = new S3Client();
