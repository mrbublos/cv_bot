import { DatabaseClient } from '../../db/DatabaseClient';
import { JobRepository } from '../JobRepository';
import { mock, MockProxy } from 'jest-mock-extended';

describe('JobRepository', () => {
  let db: MockProxy<DatabaseClient>;
  let jobRepository: JobRepository;

  beforeEach(() => {
    // Create a new mock database instance
    db = mock<DatabaseClient>();
    jobRepository = new JobRepository(db);
  });

  describe('createJob', () => {
    it('should create a job with type and payload', async () => {
      const jobType = 'test-job';
      const payload = { data: 'test-data' };
      const lastID = 1;

      db.run.mockResolvedValue({ lastID });
      
      const result = await jobRepository.createJob(jobType, payload);

      expect(db.ensureConnected).toHaveBeenCalled();
      expect(db.run).toHaveBeenCalledWith(
        'INSERT INTO jobs (type, status, payload) VALUES (?, ?, ?)',
        jobType,
        'pending',
        JSON.stringify(payload)
      );
      expect(result).toBe(lastID);
    });

    it('should create a job without payload', async () => {
      const jobType = 'test-job';
      const lastID = 1;

      db.run.mockResolvedValue({ lastID });
      
      const result = await jobRepository.createJob(jobType);

      expect(db.run).toHaveBeenCalledWith(
        'INSERT INTO jobs (type, status, payload) VALUES (?, ?, ?)',
        jobType,
        'pending',
        null
      );
      expect(result).toBe(lastID);
    });
  });

  describe('getJob', () => {
    it('should retrieve a job and parse JSON fields', async () => {
      const jobId = 1;
      const mockJob = {
        id: jobId,
        type: 'test-job',
        status: 'completed',
        payload: JSON.stringify({ data: 'test-data' }),
        result: JSON.stringify({ output: 'test-output' }),
      };

      db.get.mockResolvedValue(mockJob);
      
      const result = await jobRepository.getJob(jobId);

      expect(db.ensureConnected).toHaveBeenCalled();
      expect(db.get).toHaveBeenCalledWith('SELECT * FROM jobs WHERE id = ?', jobId);
      expect(result).toEqual({
        ...mockJob,
        payload: { data: 'test-data' },
        result: { output: 'test-output' },
      });
    });

    it('should handle job not found', async () => {
      const jobId = 999;
      db.get.mockResolvedValue(undefined);
      
      const result = await jobRepository.getJob(jobId);

      expect(result).toBeUndefined();
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status to running', async () => {
      const jobId = 1;
      
      await jobRepository.updateJobStatus(jobId, 'running');

      expect(db.ensureConnected).toHaveBeenCalled();
      expect(db.run).toHaveBeenCalledWith(
        'UPDATE jobs SET status = ?, started_at = datetime("now") WHERE id = ?',
        'running',
        jobId
      );
    });

    it('should update job status to completed with result', async () => {
      const jobId = 1;
      const result = { output: 'test-output' };
      
      await jobRepository.updateJobStatus(jobId, 'completed', result);

      expect(db.run).toHaveBeenCalledWith(
        'UPDATE jobs SET status = ?, completed_at = datetime("now"), result = ? WHERE id = ?',
        'completed',
        JSON.stringify(result),
        jobId
      );
    });

    it('should update job status to failed with error', async () => {
      const jobId = 1;
      const error = 'Test error message';
      
      await jobRepository.updateJobStatus(jobId, 'failed', undefined, error);

      expect(db.run).toHaveBeenCalledWith(
        'UPDATE jobs SET status = ?, completed_at = datetime("now"), error = ? WHERE id = ?',
        'failed',
        error,
        jobId
      );
    });
  });

  describe('getNextPendingJob', () => {
    it('should retrieve the next pending job', async () => {
      const mockJob = {
        id: 1,
        type: 'test-job',
        status: 'pending',
        payload: JSON.stringify({ data: 'test-data' }),
      };

      db.get.mockResolvedValue(mockJob);
      
      const result = await jobRepository.getNextPendingJob();

      expect(db.ensureConnected).toHaveBeenCalled();
      expect(db.get).toHaveBeenCalledWith(
        'SELECT * FROM jobs WHERE status = ? ORDER BY created_at ASC LIMIT 1',
        'pending'
      );
      expect(result).toEqual({
        ...mockJob,
        payload: { data: 'test-data' },
      });
    });

    it('should return undefined when no pending jobs exist', async () => {
      db.get.mockResolvedValue(undefined);
      
      const result = await jobRepository.getNextPendingJob();

      expect(result).toBeUndefined();
    });
  });
});
