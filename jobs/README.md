# Job System

This module provides a job queuing and processing system for background tasks, specifically designed for monitoring training jobs.

## Overview

The job system allows you to:
1. Create and manage background jobs
2. Monitor long-running tasks like model training
3. Handle job completion and failure with callbacks
4. Track job status in the database

## Job Types

### Training Status Job

Monitors the status of a RunPod training job and handles completion/failure.

#### Usage

```typescript
// Initialize the job system
const jobManager = await initializeJobSystem(db);

// Create a model client and set the job manager
const modelClient = new ModelClient(process.env.RUNPOD_API_KEY!);
modelClient.setJobManager(jobManager);

// Start monitoring a training job
const jobId = await modelClient.monitorTrainingJob(
  'training-job-123',
  async (result) => {
    console.log('Training completed successfully:', result);
    // Update UI or notify user
  },
  async (error) => {
    console.error('Training failed:', error);
    // Handle error
  }
);
```

## Database Schema

Jobs are stored in the database with the following schema:

- `id`: Unique job identifier
- `type`: Job type (e.g., 'monitor-training-status')
- `status`: Current status ('pending', 'running', 'completed', 'failed')
- `payload`: JSON data containing job parameters
- `result`: Job result (if completed successfully)
- `error`: Error message (if failed)
- `created_at`: When the job was created
- `started_at`: When the job started running
- `completed_at`: When the job completed or failed

## Error Handling

Jobs can fail for various reasons (network issues, API errors, etc.). The job system will:

1. Retry transient failures (configurable)
2. Call the error callback if provided
3. Update the job status in the database
4. Log the error for debugging

## Best Practices

1. Always provide both success and error callbacks
2. Keep job handlers idempotent when possible
3. Handle timeouts appropriately
4. Monitor job queue health
5. Set appropriate timeouts for long-running jobs

## Configuration

Configure the job system via environment variables:

```
JOB_RETRY_ATTEMPTS=3
JOB_RETRY_DELAY_MS=60000
JOB_TIMEOUT_MS=3600000  // 1 hour
```
