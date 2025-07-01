import axios, {AxiosInstance} from 'axios';
import {config} from "../config";

interface TrainingOptions {
    modelName: string;
    imageUrls?: string[];
    userId: string;
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    // Add other training-specific options as needed
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

export class BeamModelClient {
    private axiosInstance: AxiosInstance;

    constructor() {
        // Create axios instance with base URL and default headers
        this.axiosInstance = axios.create({
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.modelClient.beam.apiKey}`
            }
        });
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
                input: {
                    user_id: options.userId,
                    model_name: options.modelName,
                    epochs: options.epochs,
                    batch_size: options.batchSize,
                    learning_rate: options.learningRate
                }
            };

            const response = await this.axiosInstance.post(config.modelClient.beam.trainUrl!, payload);

            const jobId = response.data.id;
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
                input: {
                    extension: extension.toLowerCase().replace(/^\./, ''), // Remove leading dot if present
                    user_id: userId,
                    data: base64Image
                }
            };

            console.log(`Uploading image (${imageData.length} bytes) for user ${userId} to RunPod`);

            const response = await this.axiosInstance.post(config.modelClient.beam.fileUrl!, payload);

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

    public async deleteUserData(
        userId: string,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const payload = {
                input: {
                    action: 'clear',
                    extension: '', // Remove leading dot if present
                    user_id: userId,
                    data: '',
                }
            };

            console.log(`Clearing data for user ${userId} to RunPod`);

            const response = await this.axiosInstance.post(config.modelClient.beam.fileUrl!, payload);

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
                input: {
                    user_id: options.userId,
                    prompt: options.inputData.prompt,
                    width: options.inputData.width,
                    height: options.inputData.height,
                    num_steps: 4,
                    lora_styles: options.inputData.loraStyles,
                    lora_personal: options.inputData.loraPersonal,
                }
            };

            const response = await this.axiosInstance.post(config.modelClient.beam.inferenceUrl!, payload);

            return {
                success: true,
                jobId: response.data.id,
            };

        } catch (error) {
            console.error('Failed to run inference:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to run inference'
            };
        }
    }

    private async pollJobStatus(jobId: string): Promise<{ success: boolean; pending?: boolean; error?: string; outputs?: any }> {
        try {
            const response = await this.axiosInstance.get<JobStatusResponse>(`${config.modelClient.beam.jobUrl}/${jobId}`);

            const status = response.data.status;

            if (status === 'FAILED' || status === 'CANCELED') {
                throw new Error(`Job ${jobId} failed with status ${status}`);
            }

            return {
                success: true,
                pending: status !== 'COMPLETED',
                outputs: response.data.outputs,
            };
        } catch (error: any) {
            console.error(`Failed to get training status for job ${jobId}:`, error);
            throw new Error(`Failed to get training status for job ${jobId}: ${error.message}`);
        }

    }

    public async getTrainingStatus(jobId: string): Promise<TrainingResponse> {
        return this.pollJobStatus(jobId);
    }

    public async getInferenceStatus(jobId: string): Promise<Buffer<ArrayBuffer> | undefined> {
        const result = await this.pollJobStatus(jobId);
        if (result.success && !result.pending && result.outputs && result.outputs.length > 0) {
            return downloadFileToMemory(result.outputs[0].url);
        }
        return undefined;
    }
}

async function downloadFileToMemory(url: string): Promise<Buffer> {
    try {
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'arraybuffer', // Fetch as a binary buffer
        });

        // The file data is now in memory as a Buffer
        const fileBuffer = Buffer.from(response.data);
        console.log('File downloaded to memory, size:', fileBuffer.length, 'bytes');
        return fileBuffer;
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
}

interface Stats {
    active_containers: number;
    queue_depth: number;
}

interface JobStatusResponse {
    id: string;
    started_at: string;
    ended_at: string;
    status: string;
    container_id: string;
    updated_at: string;
    created_at: string;
    outputs: any[];
    stats: Stats;
}