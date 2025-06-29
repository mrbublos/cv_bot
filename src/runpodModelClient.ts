interface TrainingOptions {
  modelName: string;
  datasetPath: string;
  userId: string;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  // Add other training-specific options as needed
}

interface InferenceOptions {
  modelName: string;
  userId: string;
  inputData: any; // Replace 'any' with a more specific type based on your model's input
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    // Add other inference parameters as needed
  };
}

interface TrainingResponse {
  success: boolean;
  modelId?: string;
  metrics?: {
    loss: number;
    accuracy?: number;
    // Add other metrics as needed
  };
  error?: string;
}

interface InferenceResponse {
  success: boolean;
  resultUrl?: string;  // URL to the inference result
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

export class ModelClient {
  private apiKey: string;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(apiKey: string, baseUrl: string = 'https://api.runpod.ai/v2') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Create axios instance with base URL and default headers
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  /**
   * Upload images before training
   * @param options Image upload options
   * @returns Promise with upload status
   */
  public async uploadImages(options: ImageUploadOptions): Promise<ImageUploadResponse> {
    try {
      if (!options.imageUrls || options.imageUrls.length === 0) {
        return { success: false, error: 'No image URLs provided' };
      }

      console.log(`Starting upload of ${options.imageUrls.length} images`);
      
      // Filter out already uploaded images
      const newImages = options.imageUrls.filter(url => !this.uploadedImages.has(url));
      
      if (newImages.length === 0) {
        console.log('All images already uploaded');
        return { success: true, uploadedCount: 0 };
      }

      // In a real implementation, this would make API calls to upload each image
      // For now, we'll simulate the upload
      await Promise.all(
        newImages.map(async (url) => {
          // Simulate upload delay
          await new Promise(resolve => setTimeout(resolve, 200));
        })
      );

      console.log(`Successfully uploaded ${newImages.length} images`);
      return { success: true, uploadedCount: newImages.length };
    } catch (error) {
      console.error('Failed to upload images:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload images' 
      };
    }
  }

  /**
   * Start training a new model with the given options
   * @returns Promise that resolves when the training task is successfully accepted
   */
  public async train(options: TrainingOptions & { imageUrls?: string[] }): Promise<{ success: boolean; jobId?: string; error?: string }> {
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
      
      const response = await this.axiosInstance.post(`/${this.trainingPodId}/run`, payload);
      
      const jobId = response.data.id;
      return { success: true, jobId };
    } catch (error) {
      console.error('Failed to start training:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start training' 
      };
    }
  }
  
  /**
   * Private method to run the actual training job in the background
   */
  private async runTrainingJob(jobId: string, options: TrainingOptions): Promise<void> {
    try {
      // Simulate training delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would make API calls to monitor the training job
      console.log(`Training job ${jobId} started for model: ${options.modelName}`);
      
      // The actual training completion would be handled by a webhook or polling mechanism
    } catch (error) {
      console.error(`Training job ${jobId} failed:`, error);
    }
  }

  /**
   * Upload a single raw image to RunPod for processing
   * @param userId The ID of the user uploading the image
   * @param imageData The raw image data as a Uint8Array
   * @param extension The file extension of the image (e.g., 'png', 'jpg', 'jpeg')
   * @returns Promise with the upload status and response data
   */
  public async uploadImage(
    userId: string, 
    imageData: Uint8Array,
    extension: string = 'png'  // Default to png if not specified
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!imageData || !(imageData instanceof Uint8Array) || imageData.length === 0) {
      throw new Error('Valid image data is required');
    }

    try {
      const url = `https://api.runpod.ai/v2/${this.collectPodId}/runsync`;
      
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
      
      const response = await this.axiosInstance.post(`/${this.collectPodId}/runsync`, payload);
      
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

  /**
   * Upload multiple images by fetching them from S3 URLs
   * @param options Configuration for the image upload
   * @returns Promise with the upload result
   */
  public async uploadImages(options: ImageUploadOptions): Promise<ImageUploadResponse> {
    try {
      const { userId, imageUrls, metadata = {} } = options;
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        throw new Error('At least one image URL is required');
      }
      
      // Validate that all URLs are valid S3 URLs
      const invalidUrls = imageUrls.filter(url => !this.isValidS3Url(url));
      if (invalidUrls.length > 0) {
        throw new Error(`Invalid S3 URL(s) provided: ${invalidUrls.join(', ')}`);
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
  
  /**
   * Validates if a URL is a valid S3 URL
   * @private
   */
  private isValidS3Url(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.endsWith('.amazonaws.com') && 
             urlObj.pathname.includes('/');
    } catch (e) {
      return false;
    }
  }

  /**
   * Run inference using a trained model
   * @param options Inference options including model name, user ID, and input data
   * @returns Promise with the inference result
   */
  public async infer(options: InferenceOptions): Promise<InferenceResponse> {
    try {
      console.log(`Running inference with model: ${options.modelName}`);
      
      const payload = {
        input: {
          user_id: options.userId,
          prompt: options.inputData.prompt,
          width: options.inputData.width,
          height: options.inputData.height,
          num_steps: options.parameters?.maxTokens,
          lora_styles: options.inputData.loraStyles,
          lora_personal: options.inputData.loraPersonal,
          temperature: options.parameters?.temperature
        }
      };
      
      const response = await this.axiosInstance.post(`/${this.inferencePodId}/run`, payload);
      
      return {
        success: true,
        resultUrl: response.data.output?.resultUrl || response.data.output
      };
      
    } catch (error) {
      console.error('Failed to run inference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run inference'
      };
    }
  }

  /**
   * Check the status of a training job
   */
  public async getTrainingStatus(jobId: string): Promise<TrainingResponse> {
    // Implementation will check the status of a training job
    console.log(`Checking status for job: ${jobId}`);
    
    // This is a stub implementation
    return {
      success: true,
      modelId: jobId,
      metrics: {
        loss: 0.1,
        accuracy: 0.95
      }
    };
  }
}
