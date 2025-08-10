import {JobData, JobHandler} from './types';
import TelegramBot from "node-telegram-bot-api";
import {getModelClient} from "../modelClients/modelClient";
import {s3Client} from "../s3/s3";

interface InferenceStatusJobPayload {
  jobId: string;
  userId: string;
  chatId: string;
}

export class InferenceStatusJob implements JobHandler<InferenceStatusJobPayload> {
  private readonly MAX_ATTEMPTS = 200;
  private readonly POLL_INTERVAL_MS = 30000;
  private readonly modelClient = getModelClient();
  private readonly bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  async handle(payload: InferenceStatusJobPayload): Promise<any> {
    const { jobId } = payload;
    let attempts = 0;

    while (attempts++ < this.MAX_ATTEMPTS) {
      try {
        const response = await this.modelClient.getInferenceStatus(jobId);
        
        if (response) {
          console.log(`Inference job ${jobId} completed successfully`);
          return {
            status: 'COMPLETED',
            image: response,
          };
        }

        console.log(`Inference job ${jobId} in progress, attempt ${attempts + 1}/${this.MAX_ATTEMPTS}`);
        await this.sleep(this.POLL_INTERVAL_MS);
      } catch (error: any) {
        console.error(`Error checking inference status for job ${jobId}:`, error);
        throw new Error(`Error checking inference status for job ${jobId}: ${error.message}`);
      }
    }

    throw new Error(`Max polling attempts (${this.MAX_ATTEMPTS}) reached for job ${jobId}`);
  }

  async onSuccess(result: any, job: JobData<InferenceStatusJobPayload>): Promise<void> {
    console.log(`InferenceStatusJob completed for job ${job.id}`);
    // const image = await s3Client.load(result.image);
    this.bot.sendPhoto(job.payload.chatId, Buffer.from(result.image, 'base64'));
    s3Client.delete(result.image);
  }

  async onError(error: Error, job: JobData<InferenceStatusJobPayload>): Promise<void> {
    console.error(`InferenceStatusJob failed for job ${job.id}:`, error);
    this.bot.sendMessage(job.payload.chatId, "Failed to generate image, please try again");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}