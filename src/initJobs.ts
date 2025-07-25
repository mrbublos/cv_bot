import {TrainingStatusJob} from './jobs/trainingStatusJob';
import {Database} from './db/database';
import {InferenceStatusJob} from "./jobs/inferenceStatusJob";
import TelegramBot from "node-telegram-bot-api";
import {JobManager} from "./jobs/jobManager";
import {CheckStyleStatusJob} from "./jobs/checkStyleStatusJob";

export function initializeJobSystem(db: Database, bot: TelegramBot): JobManager {
  // Create job manager with database instance
  const jobManager = new JobManager(db);
  
  jobManager.registerHandler('monitor-training-status', new TrainingStatusJob(db, bot));
  jobManager.registerHandler('generate-image', new InferenceStatusJob(bot));
  jobManager.registerHandler('check-style-status', new CheckStyleStatusJob(bot));

  console.log('Job system initialized with training status monitoring');
  return jobManager;
}