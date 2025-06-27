import sqlite3 from 'sqlite3';
import { open, Database as SqliteDatabase } from 'sqlite';

export interface User {
  id: number;
  telegram_id: number;
  state: string;
  created_at: string;
}

export class Database {
  private db!: SqliteDatabase;

  constructor(dbPath: string) {
    this.connect(dbPath);
  }

  private async connect(dbPath: string) {
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        state TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getUser(telegramId: number): Promise<User | undefined> {
    return this.db.get('SELECT * FROM users WHERE telegram_id = ?', telegramId);
  }

  async createUser(telegramId: number): Promise<void> {
    await this.db.run('INSERT INTO users (telegram_id, state) VALUES (?, ?)', telegramId, 'start');
  }

  async updateUserState(telegramId: number, state: string): Promise<void> {
    await this.db.run('UPDATE users SET state = ? WHERE telegram_id = ?', state, telegramId);
  }
}
