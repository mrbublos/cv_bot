import axios, {AxiosInstance} from 'axios';
import {config} from "../config";
import {s3Client} from "../s3/s3";

interface TrainingOptions {
    modelName?: string;
    imageUrls?: string[];
    userId: string;
    steps?: number;
}

interface InferenceOptions {
    userId: string;
    inputData: any; // Replace 'any' with a more specific type based on your model's input
}

interface TrainingResponse {
    success: boolean;
    pending?: boolean;
    error?: string;
}

interface InferenceResponse {
    success: boolean;
    jobId?: string;  // URL to the inference result
    error?: string;
}

interface ImageUploadOptions {
    userId: string;
    imageUrls: string[];  // List of S3 URLs
    metadata?: Record<string, any>;  // Optional metadata
}

interface ImageUploadResponse {
    success: boolean;
    uploadedCount?: number;
    error?: string;
}

export class ModalModelClient {
    private axiosInstance: AxiosInstance;

    constructor() {
        // Create axios instance with base URL and default headers
        this.axiosInstance = axios.create({
            baseURL: config.modelClient.modal.url,
            headers: {
                'Content-Type': 'application/json',
                'Modal-Key': config.modelClient.modal.key,
                'Modal-Secret': config.modelClient.modal.secret,
            }
        });
    }


    async checkStyle(userId: string, prompt: string, link: string): Promise<{
        success: boolean;
        jobId?: string;
        error?: string
    }> {
        try {
            const response = await this.axiosInstance.post(`/submit?action=check_style`, {
                prompt: prompt,
                user_id: userId,
                num_steps: 50,
                width: 1024,
                height: 1024,
                min_scale: 0.2,
                max_scale: 1.5,
                scale_step: 0.1,
                style_link: link
            });
            const jobId = response.data;
            console.log(`check style job started. Job ID: ${jobId} ${response.data}`);
            return {success: true, jobId};
        } catch (error) {
            console.error('Failed to start training:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start training'
            };
        }
    }

    public async train(options: TrainingOptions): Promise<{
        success: boolean;
        jobId?: string;
        error?: string
    }> {
        // Upload images if provided
        if (options.imageUrls && options.imageUrls.length > 0) {
            const uploadResult = await this.uploadImages({
                userId: options.userId,
                imageUrls: options.imageUrls
            });

            if (!uploadResult.success) {
                return {
                    success: false,
                    error: `Failed to upload images: ${uploadResult.error}`
                };
            }
        }

        try {
            console.log(`Starting training for model: ${options.modelName}`);

            const payload = {
                user_id: options.userId,
                steps: options.steps,
            };

            const response = await this.axiosInstance.post(`/submit?action=train`, payload);

            console.log(`Training job started. Job ID: ${response.data}`);
            const jobId = response.data;
            return {success: true, jobId};
        } catch (error) {
            console.error('Failed to start training:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start training'
            };
        }
    }

    public async uploadImage(
        userId: string,
        imageData: Uint8Array,
        extension: string = 'png'  // Default to png if not specified
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!imageData || imageData.length === 0) {
            throw new Error('Valid image data is required');
        }

        try {
            // Convert Uint8Array to base64
            const base64Image = Buffer.from(imageData).toString('base64');

            const payload = {
                action: 'store',
                extension: extension.toLowerCase().replace(/^\./, ''), // Remove leading dot if present
                user_id: userId,
                image_data: base64Image
            };

            console.log(`Uploading image (${imageData.length} bytes) for user ${userId} to RunPod`);

            const response = await this.axiosInstance.post(`/submit?action=file`, payload);

            const jobResult = await this.pollJobStatus(response.data);

            return {
                success: jobResult.success,
                data: response.data
            };
        } catch (error) {
            console.error('Failed to upload image to RunPod:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload image to RunPod'
            };
        }
    }

    public async deleteUserData(
        userId: string,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const payload = {
                action: 'clear',
                extension: '', // Remove leading dot if present
                user_id: userId,
                data: '',
            };

            console.log(`Clearing data for user ${userId} to RunPod`);

            const response = await this.axiosInstance.post(`/submit?action=file`, payload);

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Failed to upload image to RunPod:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload image to RunPod'
            };
        }
    }


    public async uploadImages(options: ImageUploadOptions): Promise<ImageUploadResponse> {
        try {
            const {userId, imageUrls, metadata = {}} = options;

            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                throw new Error('At least one image URL is required');
            }

            let successCount = 0;
            const errors: string[] = [];

            // Process each image URL
            for (const url of imageUrls) {
                try {
                    // In a real implementation, you would:
                    // 1. Fetch the image from S3
                    // 2. Get the raw image data as Uint8Array
                    // For now, we'll simulate this with a placeholder
                    const imageData = new Uint8Array(1024); // Placeholder for actual image data

                    // Upload the raw image data
                    const result = await this.uploadImage(userId, imageData);

                    if (result.success) {
                        successCount++;
                    } else {
                        errors.push(`Failed to upload ${url}: ${result.error}`);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`Error processing ${url}: ${errorMessage}`);
                }
            }

            if (successCount === 0 && errors.length > 0) {
                throw new Error(`All uploads failed: ${errors.join('; ')}`);
            }

            return {
                success: true,
                uploadedCount: successCount,
                ...(errors.length > 0 && {
                    warning: `${errors.length} of ${imageUrls.length} uploads had issues`,
                    errors
                })
            };

        } catch (error) {
            console.error('Failed to upload images:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload images',
                uploadedCount: 0
            };
        }
    }

    public async infer(options: InferenceOptions): Promise<InferenceResponse> {
        try {
            const payload = {
                user_id: options.userId,
                prompt: options.inputData.prompt,
                width: options.inputData.width,
                height: options.inputData.height,
                num_steps: config.modelClient.inference.numSteps,
                lora_styles: options.inputData.loraStyles,
                lora_personal: options.inputData.loraPersonal,
            };

            const response = await this.axiosInstance.post(`/submit?action=inference`, payload);
            return {
                success: true,
                jobId: response.data,
            };

        } catch (error) {
            console.error('Failed to run inference:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to run inference'
            };
        }
    }

    async pollJobStatus(jobId: string): Promise<{ success: boolean; status: string; data?: any; error?: string }> {
        try {
            const response = await this.axiosInstance.post(`/status/${jobId}`);
            console.log("polling response", response.data);

            let status = response.data.result ?? response.data.status;
            switch (status.toLowerCase()) {
                case 'pending':
                    status = 'PENDING';
                    break;
                case 'success':
                case 'completed':
                    status = 'COMPLETED';
                    break;
                case 'failed':
                case 'canceled':
                    throw new Error(response.data.error || `Job ${status.toLowerCase()}`);
            }
            console.log(`Status of inference job ${jobId}:`, status);
            return {
                success: true,
                status,
                data: response.data,
            };
        } catch (error) {
            console.error(`Failed to get inference status for job ${jobId}:`, error);
            return {
                success: false,
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Failed to get inference status'
            };
        }
    }

    public async getTrainingStatus(jobId: string): Promise<TrainingResponse> {
        try {
            const response = await this.pollJobStatus(jobId);

            const status = response.status;
            console.log(`Status of training job ${jobId}:`, status);

            if (status === 'FAILED' || status === 'CANCELED') {
                return {
                    success: false,
                    error: response.error || `Job ${status.toLowerCase()}`
                };
            }

            return {
                success: true,
                pending: status !== 'COMPLETED',
            };
        } catch (error) {
            console.error(`Failed to get training status for job ${jobId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get training status'
            };
        }
    }

    async getCheckStyleStatus(jobId: string): Promise<Buffer<ArrayBuffer> | undefined> {
        try {
            const response = await this.pollJobStatus(jobId);

            const status = response.status;
            console.log(`Status of check style job${jobId}:`, status);

            if (status === 'FAILED' || status === 'CANCELED') {
                throw new Error(response.error || `Job ${status.toLowerCase()}`);
            }

            if (status === 'COMPLETED') {
                let filename = response.data.filename;
                console.log("Downloading file:", filename);
                const content = await s3Client.load(filename);
                await s3Client.delete(filename);
                return content;
            }


            return undefined;
        } catch (error) {
            console.error(`Failed to get training status for job ${jobId}:`, (error as any)?.message);
            throw error;
        }
    }

    public async getInferenceStatus(jobId: string): Promise<string | undefined> {
        try {
            const response = await this.pollJobStatus(jobId);

            const status = response.status;
            console.log(`Status of inference job ${jobId}:`, status);

            if (status === 'FAILED' || status === 'CANCELED') {
                throw new Error(response.error || `Job ${status.toLowerCase()}`);
            }

            if (status === 'COMPLETED') {
                return response.data.image_data;
            }

            return undefined;
        } catch (error) {
            console.error(`Failed to get training status for job ${jobId}:`, error);
            throw error;
        }
    }
}
