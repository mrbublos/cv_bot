import { JobHandler } from '../types';

export interface ProcessImagePayload {
  imageUrl: string;
  userId: string;
  options?: {
    resize?: { width: number; height: number };
    filter?: string;
  };
}

export class ProcessImageJob implements JobHandler<ProcessImagePayload> {
  async handle(payload: ProcessImagePayload) {
    console.log(`Processing image for user ${payload.userId}: ${payload.imageUrl}`);
    
    // Simulate some image processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return the processing result
    return {
      processedUrl: `https://processed.example.com/${Date.now()}.jpg`,
      metadata: {
        originalUrl: payload.imageUrl,
        processedAt: new Date().toISOString(),
        options: payload.options
      }
    };
  }

  async onSuccess(result: any, job: any) {
    console.log(`Successfully processed image job ${job.id}`);
    // Here you could update the database, send a notification, etc.
  }

  async onError(error: Error, job: any) {
    console.error(`Failed to process image job ${job.id}:`, error);
    // Here you could send an error notification, update the UI, etc.
  }
}
