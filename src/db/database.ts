import sqlite3 from 'sqlite3';
import { open, Database as SqliteDatabase } from 'sqlite';
import { DatabaseClient } from './DatabaseClient';

export interface User {
  id: number;
  telegram_id: string;
  state: string;
  created_at: string;
}

export class Database implements DatabaseClient {
  private db!: SqliteDatabase;

  constructor(dbPath: string) {
    this.connect(dbPath);
  }

  public async ensureConnected() {
    if (!this.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.db) {
        throw new Error('Database connection not established');
      }
    }
  }

  public async run(sql: string, ...params: any[]): Promise<{ lastID?: number }> {
    await this.ensureConnected();
    return this.db.run(sql, ...params);
  }

  public async get(sql: string, ...params: any[]): Promise<any> {
    await this.ensureConnected();
    return this.db.get(sql, ...params);
  }

  private async connect(dbPath: string) {
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payload TEXT,
        result TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id VARCHAR UNIQUE,
        chat_id VARCHAR UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS user_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
      CREATE TABLE IF NOT EXISTS training_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR UNIQUE,
        status TEXT CHECK(status IN ('not_started', 'in_progress', 'completed', 'failed')),
        started_at DATETIME,
        completed_at DATETIME,
        job_id TEXT,
        training_parameters TEXT, -- Store as JSON string
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);
  }

  // Job related methods have been moved to JobRepository

  async getUser(telegramId: string): Promise<User | undefined> {
    return this.db.get('SELECT * FROM users WHERE telegram_id = ?', telegramId);
  }

  async createUser(telegramId: string, chatId: string): Promise<void> {
    await this.db.run('INSERT INTO users (telegram_id, chat_id) VALUES (?, ?)', telegramId, chatId);
  }


  async addUserImage(userId: string, imageUrl: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run('INSERT INTO user_images (user_id, image_url) VALUES (?, ?)', userId, imageUrl);
  }

  async getUserImageCount(userId: string): Promise<number> {
    await this.ensureConnected();
    const result = await this.db.get<{count: number}>(
      'SELECT COUNT(*) as count FROM user_images WHERE user_id = ?', 
      userId
    );
    return result?.count || 0;
  }

  async getTrainingStatus(userId: string): Promise<{
    status: string;
    job_id?: string;
    training_parameters?: any;
    started_at?: string;
    completed_at?: string;
  }> {
    await this.ensureConnected();
    const result = await this.db.get<{
      status: string;
      job_id?: string;
      training_parameters?: string;
      started_at?: string;
      completed_at?: string;
    }>(
      'SELECT status, job_id, training_parameters, started_at, completed_at FROM training_status WHERE user_id = ?',
      userId
    );

    if (!result) {
      return { status: 'not_started' };
    }

    return {
      status: result.status,
      job_id: result.job_id,
      training_parameters: result.training_parameters ? JSON.parse(result.training_parameters) : undefined,
      started_at: result.started_at,
      completed_at: result.completed_at
    };
  }

  async startTraining(userId: string, params: any = {}): Promise<void> {
    await this.ensureConnected();
    const paramsJson = JSON.stringify(params);
    await this.db.run(
      `INSERT INTO training_status
       (user_id, status, started_at, completed_at, training_parameters) 
       VALUES (?, ?, CURRENT_TIMESTAMP, NULL, ?)`,
      userId,
      'in_progress',
      paramsJson
    );
  }

  async completeTraining(userId: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run(
      'UPDATE training_status SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      'completed',
      userId
    );
  }

  async failTraining(userId: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run(
        'UPDATE training_status SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        'failed',
        userId
    );
  }

  async getUserImages(userId: string): Promise<{id: number, user_id: string, image_url: string, created_at: string}[]> {
    await this.ensureConnected();
    return this.db.all(
      'SELECT id, user_id, image_url, created_at FROM user_images WHERE user_id = ? ORDER BY created_at',
      userId
    );
  }

  async updateTrainingJobId(userId: string, jobId: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run(
      'UPDATE training_status SET job_id = ? WHERE user_id = ?',
      jobId,
      userId
    );
  }

  async createJob(type: string, payload: any): Promise<number | undefined> {
    await this.ensureConnected();
    const result = await this.db.run(
      'INSERT INTO jobs (type, payload) VALUES (?, ?)',
      type,
      JSON.stringify(payload)
    );
    return result.lastID;
  }

  async resetTrainingStatus(userId: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run(
      `UPDATE training_status 
       SET status = 'not_started', 
           started_at = NULL, 
           completed_at = NULL, 
           job_id = NULL 
       WHERE user_id = ?`,
      userId
    );
  }

  async deleteUserImages(userId: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run('DELETE FROM user_images WHERE user_id = ?', userId);
  }

  async deleteTrainingStatus(userId: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run('DELETE FROM training_status WHERE user_id = ?', userId);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.ensureConnected();
    await this.db.run('DELETE FROM users WHERE telegram_id = ?', userId);
  }

  async extractImageFilenames(userId: string): Promise<string[]> {
    await this.ensureConnected();
    const images = await this.db.all<{image_url: string}[]>(
      'SELECT image_url FROM user_images WHERE user_id = ?',
      userId
    );
    return images.map(img => {
      const url = img.image_url;
      // Extract filename from the URL
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1];
    });
  }
}
