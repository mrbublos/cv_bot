import { Database } from '../database';
import { unlinkSync, existsSync } from 'fs';
import path from 'path';

describe('Database', () => {
  const testDbPath = path.join(__dirname, 'test.db');
  let db: Database;

  // Clean up test database before each test
  beforeAll(async () => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);
    // Wait for database connection to be established
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  // Clean up test database after all tests
  afterAll(async () => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    // Close the database connection
    if (db) {
      // @ts-ignore - accessing private property for cleanup
      await db.db?.close();
    }
  });

  describe('User Management', () => {
    const testTelegramId = 'test123';
    const testChatId = 'chat123';

    it('should create a new user', async () => {
      await db.createUser(testTelegramId, testChatId);
      const user = await db.getUser(testTelegramId);
      
      expect(user).toBeDefined();
      expect(user?.telegram_id).toBe(testTelegramId);
    });

    it('should return undefined for non-existent user', async () => {
      const user = await db.getUser('non-existent-id');
      expect(user).toBeUndefined();
    });
  });

  describe('User Images', () => {
    const testUserId = 'user123';
    const testImageUrl = 'https://example.com/image.jpg';

    it('should add an image for a user', async () => {
      await db.addUserImage(testUserId, testImageUrl);
      const imageCount = await db.getUserImageCount(testUserId);
      
      expect(imageCount).toBe(1);
    });

    it('should get user images', async () => {
      await db.addUserImage(testUserId, 'https://example.com/another.jpg');
      const images = await db.getUserImages(testUserId);
      
      expect(images).toHaveLength(2);
      expect(images[0].image_url).toBe(testImageUrl);
      expect(images[1].image_url).toBe('https://example.com/another.jpg');
    });

    it('should return correct image count', async () => {
      const count = await db.getUserImageCount(testUserId);
      expect(count).toBe(2);
    });
  });

  describe('Training Status', () => {
    const testUserId = 'training-user-123';
    const testParams = { epochs: 10, learningRate: 0.001 };

    it('should start training with initial status', async () => {
      await db.startTraining(testUserId, testParams);
      const status = await db.getTrainingStatus(testUserId);
      
      expect(status.status).toBe('in_progress');
      expect(status.training_parameters).toEqual(testParams);
      expect(status.started_at).toBeDefined();
    });

    it('should complete training', async () => {
      await db.completeTraining(testUserId);
      const status = await db.getTrainingStatus(testUserId);
      
      expect(status.status).toBe('completed');
      expect(status.completed_at).toBeDefined();
    });

    it('should fail training', async () => {
      const failUserId = 'fail-user-123';
      await db.startTraining(failUserId, testParams);
      await db.failTraining(failUserId);
      
      const status = await db.getTrainingStatus(failUserId);
      expect(status.status).toBe('failed');
      expect(status.completed_at).toBeDefined();
    });

    it('should update training job ID', async () => {
      const jobId = 'job-123';
      await db.updateTrainingJobId(testUserId, jobId);
      const status = await db.getTrainingStatus(testUserId);
      
      expect(status.job_id).toBe(jobId);
    });

    it('should reset training status', async () => {
      await db.resetTrainingStatus(testUserId);
      const status = await db.getTrainingStatus(testUserId);
      
      expect(status.status).toBe('not_started');
      // Check for both null and undefined since SQLite might return either
      expect(status.started_at).toBeFalsy();
      expect(status.completed_at).toBeFalsy();
      expect(status.job_id).toBeFalsy();
    });
  });

  describe('Job Management', () => {
    it('should create a new job', async () => {
      const jobId = await db.createJob('test-job', { param: 'value' });
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('number');
    });
  });
});
