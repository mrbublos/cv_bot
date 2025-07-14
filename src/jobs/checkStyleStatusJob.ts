import {JobData, JobHandler} from './types';
import TelegramBot from "node-telegram-bot-api";
import {RunpodModelClient} from "../modelClients/runpodModelClient";

interface CheckStyleStatusJobPayload {
  jobId: string;
  userId: string;
  chatId: string;
}

export class CheckStyleStatusJob implements JobHandler<CheckStyleStatusJobPayload> {
  private readonly MAX_ATTEMPTS = 200;
  private readonly POLL_INTERVAL_MS = 30000;
  private readonly modelClient = new RunpodModelClient();
  private readonly bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  async handle(payload: CheckStyleStatusJobPayload): Promise<any> {
    const { jobId } = payload;
    let attempts = 0;

    while (attempts++ < this.MAX_ATTEMPTS) {
      try {
        const response = await this.modelClient.getCheckStyleStatus(jobId);
        
        if (response) {
          console.log(`Inference job ${jobId} completed successfully`);
          return {
            status: 'COMPLETED',
            image: response,
          };
        }

        console.log(`Inference job ${jobId} in progress, attempt ${attempts + 1}/${this.MAX_ATTEMPTS}`);
        await this.sleep(this.POLL_INTERVAL_MS);
      } catch (error) {
        console.error(`Error checking inference status for job ${jobId}:`, error);
        throw error;
      }
    }

    throw new Error(`Max polling attempts (${this.MAX_ATTEMPTS}) reached for job ${jobId}`);
  }

  async onSuccess(result: any, job: JobData<CheckStyleStatusJobPayload>): Promise<void> {
    console.log(`InferenceStatusJob completed for job ${job.id}`);
    this.bot.sendPhoto(job.payload.chatId, result.image);
  }

  async onError(error: Error, job: JobData<CheckStyleStatusJobPayload>): Promise<void> {
    console.error(`InferenceStatusJob failed for job ${job.id}:`, error);
    this.bot.sendMessage(job.payload.chatId, `Failed to check style, please try again`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}