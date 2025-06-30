export interface DatabaseClient {
  run(sql: string, ...params: any[]): Promise<{ lastID?: number }>;
  get(sql: string, ...params: any[]): Promise<any>;
  ensureConnected(): Promise<void>;
}
