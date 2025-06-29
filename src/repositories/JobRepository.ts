import { Database } from '../db/database';

export class JobRepository {
  constructor(private db: Database) {}

  async createJob(type: string, payload?: any): Promise<number> {
    await this.db.ensureConnected();
    const result = await this.db.run(
      'INSERT INTO jobs (type, status, payload) VALUES (?, ?, ?)',
      type,
      'pending',
      payload ? JSON.stringify(payload) : null
    );
    return result.lastID!;
  }

  async getJob(id: number) {
    await this.db.ensureConnected();
    const job = await this.db.get('SELECT * FROM jobs WHERE id = ?', id);
    if (job && job.payload) job.payload = JSON.parse(job.payload);
    if (job && job.result) job.result = JSON.parse(job.result);
    return job;
  }

  async updateJobStatus(
    id: number, 
    status: 'pending' | 'running' | 'completed' | 'failed', 
    result?: any, 
    error?: string
  ) {
    await this.db.ensureConnected();
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (status === 'running') {
      updates.push('started_at = datetime("now")');
    } else if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = datetime("now")');
    }

    if (result !== undefined) {
      updates.push('result = ?');
      params.push(JSON.stringify(result));
    }

    if (error) {
      updates.push('error = ?');
      params.push(error);
    }

    params.push(id);
    await this.db.run(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`,
      ...params
    );
  }

  async getNextPendingJob() {
    await this.db.ensureConnected();
    const job = await this.db.get(
      'SELECT * FROM jobs WHERE status = ? ORDER BY created_at ASC LIMIT 1',
      'pending'
    );
    if (job && job.payload) job.payload = JSON.parse(job.payload);
    return job;
  }
}
