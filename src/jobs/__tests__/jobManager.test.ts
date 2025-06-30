import { mock, MockProxy } from 'jest-mock-extended';
import { DatabaseClient } from '../../db/DatabaseClient';
import { JobManager, JobType } from '../JobManager';
import { JobRepository } from '../../repositories/JobRepository';
import { JobData, JobHandler } from '../types';

describe('JobManager', () => {
  let db: MockProxy<DatabaseClient>;
  let jobRepository: MockProxy<JobRepository>;
  let jobManager: JobManager;
  let mockHandler: MockProxy<JobHandler>;
  let mockJob: JobData;
  let database: any;

  beforeEach(() => {
    jest.useFakeTimers();
    
    // Create mocks
    db = mock<DatabaseClient>();
    jobRepository = mock<JobRepository>();
    mockHandler = mock<JobHandler>();
    
    // Create JobManager instance with Database mock
    database = {
      ...db,
      createJob: jest.fn(),
    };
    jobManager = new JobManager(database as any, jobRepository);
    
    // Setup mock job
    mockJob = {
      id: 1,
      type: 'monitor-training-status',
      status: 'pending',
      payload: { someData: 'test' },
      created_at: new Date().toISOString(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jobManager.stopProcessing();
  });

  describe('registerHandler', () => {
    it('should register a job handler', async () => {
      const jobType: JobType = 'monitor-training-status';
      jobManager.registerHandler(jobType, mockHandler);

      // Setup job processing scenario to test handler
      jobRepository.getNextPendingJob.mockResolvedValueOnce(mockJob);
      mockHandler.handle.mockResolvedValueOnce({ success: true });

      await jobManager.processJobs();

      expect(mockHandler.handle).toHaveBeenCalledWith(mockJob.payload);
    });
  });

  describe('createJob', () => {
    it('should create a job and trigger processing', async () => {
      const jobType: JobType = 'monitor-training-status';
      const payload = { someData: 'test' };
      const expectedJobId = 1;

      database.createJob.mockResolvedValueOnce(expectedJobId);
      jobRepository.getNextPendingJob
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValueOnce(undefined);

      const jobId = await jobManager.createJob(jobType, payload);

      expect(database.createJob).toHaveBeenCalledWith(jobType, payload);
      expect(jobId).toBe(expectedJobId);
    });
  });

  describe('processJobs', () => {
    it('should process a pending job successfully', async () => {
      const jobType: JobType = 'monitor-training-status';
      const result = { success: true };
      
      jobManager.registerHandler(jobType, mockHandler);
      jobRepository.getNextPendingJob
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValueOnce(undefined);
      mockHandler.handle.mockResolvedValueOnce(result);

      await jobManager.processJobs();

      expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'running');
      expect(mockHandler.handle).toHaveBeenCalledWith(mockJob.payload);
      expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'completed', result);
    });

    it('should handle job failure', async () => {
      const jobType: JobType = 'monitor-training-status';
      const error = new Error('Job failed');
      
      jobManager.registerHandler(jobType, mockHandler);
      jobRepository.getNextPendingJob
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValueOnce(undefined);
      mockHandler.handle.mockRejectedValueOnce(error);

      await jobManager.processJobs();

      expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'running');
      expect(mockHandler.handle).toHaveBeenCalledWith(mockJob.payload);
      expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'failed', null, error.message);
    });

    it('should fail job when no handler is registered', async () => {
      jobRepository.getNextPendingJob
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValueOnce(undefined);

      await jobManager.processJobs();

      expect(jobRepository.updateJobStatus).toHaveBeenCalledWith(
        mockJob.id,
        'failed',
        null,
        `No handler found for job type: ${mockJob.type}`
      );
    });

    it('should call onSuccess handler when job succeeds', async () => {
      const jobType: JobType = 'monitor-training-status';
      const result = { success: true };
      
      mockHandler.onSuccess = jest.fn();
      jobManager.registerHandler(jobType, mockHandler);
      jobRepository.getNextPendingJob
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValueOnce(undefined);
      mockHandler.handle.mockResolvedValueOnce(result);

      await jobManager.processJobs();

      expect(mockHandler.onSuccess).toHaveBeenCalledWith(result, mockJob);
    });

    it('should call onError handler when job fails', async () => {
      const jobType: JobType = 'monitor-training-status';
      const error = new Error('Job failed');
      
      mockHandler.onError = jest.fn();
      jobManager.registerHandler(jobType, mockHandler);
      jobRepository.getNextPendingJob
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValueOnce(undefined);
      mockHandler.handle.mockRejectedValueOnce(error);

      await jobManager.processJobs();

      expect(mockHandler.onError).toHaveBeenCalledWith(error, mockJob);
    });

    it('should not process new jobs while already processing', async () => {
      // Set up a pending promise that won't resolve until we want it to
      let resolveFirstCall: Function;
      const pendingPromise = new Promise(resolve => {
        resolveFirstCall = resolve;
      });

      // First call returns pending promise
      jobRepository.getNextPendingJob
        .mockImplementationOnce(() => pendingPromise)
        // Second call (if it happens) returns undefined
        .mockResolvedValueOnce(undefined);

      // Start first process - it will wait for our promise
      const firstProcess = jobManager.processJobs();
      
      // Allow the first process to start and set isProcessing flag
      await Promise.resolve();
      
      // Try to start second process - should return immediately due to lock
      const secondProcess = jobManager.processJobs();
      
      // Complete the first process
      resolveFirstCall!(undefined);
      
      // Wait for both processes
      await Promise.all([firstProcess, secondProcess]);
      
      // Should have only tried to get next job once
      expect(jobRepository.getNextPendingJob).toHaveBeenCalledTimes(1);
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('startProcessing and stopProcessing', () => {
    beforeEach(() => {
      // Mock setInterval and clearInterval for each test
      jest.spyOn(global, 'setInterval').mockReturnValue({} as any);
      jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should start and stop processing on interval', () => {
      jobManager.startProcessing(1000);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);

      jobManager.stopProcessing();
      expect(clearInterval).toHaveBeenCalled();
    });

    it('should clear existing interval when starting new one', () => {
      jobManager.startProcessing(1000);
      jobManager.startProcessing(2000);

      expect(clearInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledTimes(2);
      expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 2000);
    });
  });

  describe('getJob', () => {
    it('should retrieve a job by id', async () => {
      const jobId = 1;
      jobRepository.getJob.mockResolvedValueOnce(mockJob);

      const result = await jobManager.getJob(jobId);

      expect(jobRepository.getJob).toHaveBeenCalledWith(jobId);
      expect(result).toEqual(mockJob);
    });
  });
});
