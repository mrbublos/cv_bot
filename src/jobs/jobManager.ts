import {Database} from '../db/database';
import {JobData, JobHandler} from './types';
import {JobRepository} from "../repositories";

export type JobType = 'monitor-training-status' | 'generate-image' | 'check-style-status';

export class JobManager {
  private handlers: Map<JobType, JobHandler> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private activeJobs: Map<number, Promise<void>> = new Map();
  private maxConcurrentJobs: number = 10;

  constructor(
    private readonly db: Database,
    private jobRepository: JobRepository = new JobRepository(db)
  ) {}

  registerHandler(type: JobType, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async createJob<T = any>(type: JobType, payload?: T): Promise<number | undefined> {
    const jobId = await this.db.createJob(type, payload);
    await this.processJobs(); // Trigger processing if not already running
    return jobId;
  }

  async getJob(id: number): Promise<JobData | undefined> {
    return this.jobRepository.getJob(id);
  }

  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Process jobs while we have capacity
      while (this.activeJobs.size < this.maxConcurrentJobs) {
        const job = await this.jobRepository.getNextPendingJob();
        if (!job) break; // No more pending jobs
        
        const handler = this.handlers.get(job.type);
        
        if (!handler) {
          await this.jobRepository.updateJobStatus(job.id, 'failed', null, `No handler found for job type: ${job.type}`);
          continue;
        }

        // Process the job asynchronously
        const jobPromise = this.processJob(job, handler).catch((err) => {
          console.error(`Error processing job ${job.id}: ${err}`);
        });
        this.activeJobs.set(job.id, jobPromise);

        // When job completes, remove it from active jobs
        jobPromise.finally(() => {
          this.activeJobs.delete(job.id);
          // Try to process more jobs if any are pending
          this.processJobs().catch((err) => {
            console.error(`Error processing jobs: ${err}`);
          });
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: JobData, handler: JobHandler): Promise<void> {
    try {
      // Mark job as running
      await this.jobRepository.updateJobStatus(job.id, 'running');

      // Execute the job
      const result = await handler.handle(job.payload);

      // Mark job as completed
      await this.jobRepository.updateJobStatus(job.id, 'completed', result);

      // Call success handler if defined
      if (handler.onSuccess) {
        await handler.onSuccess(result, job);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.jobRepository.updateJobStatus(job.id, 'failed', null, errorMessage);

      // Call error handler if defined
      if (handler.onError) {
        await handler.onError(error as Error, job);
      }
    }
  }

  startProcessing(intervalMs: number = 1000) {
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
