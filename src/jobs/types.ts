export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobData<T = any> {
  id: number;
  type: string;
  status: JobStatus;
  payload: T;
  result?: any;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface JobHandler<T = any> {
  handle(payload: T): Promise<any>;
  onSuccess?(result: any, job: JobData<T>): Promise<void>;
  onError?(error: Error, job: JobData<T>): Promise<void>;
}
