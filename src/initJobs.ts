import {JobManager} from './jobs/JobManager';
import {RunpodTrainingStatusJob} from './jobs/runpodTrainingStatusJob';
import {Database} from './db/database';
import {RunpodInferenceStatusJob} from "./jobs/runpodInferenceStatusJob";
import TelegramBot from "node-telegram-bot-api";

export function initializeJobSystem(db: Database, bot: TelegramBot): JobManager {
  // Create job manager with database instance
  const jobManager = new JobManager(db);
  
  jobManager.registerHandler('monitor-training-status', new RunpodTrainingStatusJob(db, bot));
  jobManager.registerHandler('generate-image', new RunpodInferenceStatusJob(bot));

  console.log('Job system initialized with training status monitoring');
  return jobManager;
}
