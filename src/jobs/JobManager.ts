import { Database } from '../db/database';
import { JobData, JobHandler, JobStatus } from './types';

export class JobManager {
  private handlers: Map<string, JobHandler> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(private db: Database) {}

  registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async createJob<T = any>(type: string, payload?: T): Promise<number> {
    const jobId = await this.db.createJob(type, payload);
    this.processJobs(); // Trigger processing if not already running
    return jobId;
  }

  async getJob(id: number): Promise<JobData | undefined> {
    return this.jobRepository.getJob(id);
  }

  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let job = await this.jobRepository.getNextPendingJob();
      
      while (job) {
        const handler = this.handlers.get(job.type);
        
        if (!handler) {
          await this.jobRepository.updateJobStatus(job.id, 'failed', null, `No handler found for job type: ${job.type}`);
          job = await this.jobRepository.getNextPendingJob();
          continue;
        }

        // Mark job as running
        await this.jobRepository.updateJobStatus(job.id, 'running');

        try {
          // Execute the job
          const result = await handler.handle(job.payload);
          
          // Mark job as completed
          await this.jobRepository.updateJobStatus(job.id, 'completed', result);
          
          // Call success handler if defined
          if (handler.onSuccess) {
            await handler.onSuccess(result, job as JobData);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.jobRepository.updateJobStatus(job.id, 'failed', null, errorMessage);
          
          // Call error handler if defined
          if (handler.onError) {
            await handler.onError(error as Error, job as JobData);
          }
        }

        // Get next pending job
        job = await this.jobRepository.getNextPendingJob();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  startProcessing(intervalMs: number = 5000) {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    // Process immediately
    this.processJobs().catch(console.error);
    
    // Then process on interval
    this.processingInterval = setInterval(() => {
      this.processJobs().catch(console.error);
    }, intervalMs);
  }

  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}
