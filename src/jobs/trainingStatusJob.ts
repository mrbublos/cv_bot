import {JobData, JobHandler} from './types';
import {Database} from "../db/database";
import TelegramBot from "node-telegram-bot-api";
import {getModelClient} from "../modelClients/modelClient";

interface TrainingStatusJobPayload {
  userId: string;
  chatId: string;
  jobId: string;
}

export class TrainingStatusJob implements JobHandler<TrainingStatusJobPayload> {
  private readonly MAX_ATTEMPTS = 200;
  private readonly POLL_INTERVAL_MS = 30000;
  private readonly modelClient = getModelClient();
  private readonly db: Database;
  private readonly bot: TelegramBot;

  constructor(db: Database, bot: TelegramBot) {
      this.bot = bot;
      this.db = db;
  }

  async handle(payload: TrainingStatusJobPayload): Promise<any> {
    const {
      jobId,
    } = payload;

    let attempts = 0;

    while (attempts < this.MAX_ATTEMPTS) {
      try {
        const response = await this.modelClient.getTrainingStatus(jobId);
        if (response.success && !response.pending) {
          return;
        }

        console.log(`Training job ${jobId}, attempt ${attempts + 1}/${this.MAX_ATTEMPTS}`);
        await this.sleep(this.POLL_INTERVAL_MS);
        attempts++;
      } catch (error) {
        console.error(`Error checking training status for job ${jobId}:`, error);
        throw error;
      }
    }

    throw new Error(`Max polling attempts (${this.MAX_ATTEMPTS}) reached for job ${jobId}`);
  }

  async onSuccess(result: any, job: JobData<TrainingStatusJobPayload>): Promise<void> {
    console.log(`TrainingStatusJob completed for job ${job.id}`, result);
    await this.db.completeTraining(job.payload.userId);
    this.bot.sendMessage(job.payload.chatId, "Training completed you can now generate images with prompts");
  }

  async onError(error: Error, job: JobData<TrainingStatusJobPayload>): Promise<void> {
    console.error(`TrainingStatusJob failed for job ${job.id}:`, error);
    await this.db.failTraining(job.payload.userId);
    this.bot.sendMessage(job.payload.chatId, "Failed to do the training, please try again");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
