import {Action, ActionContext} from './baseAction';
import {s3Client} from '../s3/s3';
import {v4 as uuidv4} from 'uuid';
import {getModelClient} from "../modelClients/modelClient";
import {config} from "../config";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ImageUploadAction extends Action {
    private readonly REQUIRED_IMAGES = 10;
    private modelClient = getModelClient();

    private async startTraining(chatId: string, userId: string) {
        try {
            // Get all image URLs for the user
            const images = await this.db.getUserImages(userId);

            // Define training parameters
            const trainingParams = {
                datasetPath: images.map(img => img.image_url),
                steps: config.modelClient.training.numSteps!,
                startedAt: new Date().toISOString(),
                userId,
            };

            const trainResponse = await this.modelClient.train(trainingParams);

            if (!trainResponse.success) {
                throw new Error(trainResponse.error || 'Failed to start training');
            }

            await this.db.startTraining(userId, trainingParams);

            // Store the job ID for future reference
            await this.jobManager.createJob("monitor-training-status", {userId, chatId, jobId: trainResponse.jobId});

            // Notify user that training has started
            await this.bot.sendMessage(chatId, '⏳ Model training has started. You will be notified when it completes.');

            return true;
        } catch (error) {
            console.error('Error starting training:', error);
            await this.db.resetTrainingStatus(userId);
            await this.bot.sendMessage(chatId, '❌ Failed to start model training. Please try again.');
            return false;
        }
    }

    public async execute(context: ActionContext): Promise<void> {
        const {bot, msg, user} = context;
        const chatId = msg.chat.id.toString();
        const userId = user.id.toString();

        // Check training status first
        const trainingStatus = await this.db.getTrainingStatus(userId);
        if (trainingStatus.status === 'in_progress') {
            bot.sendMessage(chatId, '⏳ Your model is currently training. Please wait until it completes before uploading more images.');
            return;
        } else if (trainingStatus.status === 'completed') {
            bot.sendMessage(chatId, '✅ Your model has already been trained. No more images can be uploaded.');
            return;
        }

        if (msg.photo && msg.photo.length > 0) {
            const photo = msg.photo[msg.photo.length - 1];
            const fileStream = bot.getFileStream(photo.file_id);
            const file = await bot.getFile(photo.file_id);
            const extension = file.file_path?.split('.')?.pop() ?? '.jpg';
            const fileName = `${uuidv4()}.${extension}`;

            const chunks: Buffer[] = [];

            fileStream.on('data', (chunk) => {
                chunks.push(chunk);
            });

            fileStream.on('end', async () => {
                try {
                    // Combine all chunks into a single buffer
                    const fileBuffer = Buffer.concat(chunks);
                    const s3Url = await s3Client.save(fileName, fileBuffer);
                    await this.modelClient.uploadImage(userId, fileBuffer, extension);

                    await this.db.addUserImage(userId, s3Url);

                    // Get current image count
                    const imageCount = await this.db.getUserImageCount(userId);

                    bot.sendMessage(chatId, `✅ Image uploaded successfully! (${imageCount}/${this.REQUIRED_IMAGES} images)`);

                    // Check if we've reached the required number of images
                    if (imageCount >= this.REQUIRED_IMAGES) {
                        bot.sendMessage(chatId, `🎯 You've uploaded ${this.REQUIRED_IMAGES} images! Starting model training (can take up to several minutes)...`);
                        // volumes sync in beam take up to 60 seconds
                        await sleep(60000);
                        await this.startTraining(chatId, userId);
                    }
                } catch (error) {
                    console.error('Error processing image:', error);
                    bot.sendMessage(chatId, '❌ Sorry, there was an error uploading your image.');
                }
            });

            fileStream.on('error', (error) => {
                console.error('File stream error:', error);
                bot.sendMessage(chatId, '❌ Sorry, there was an error receiving your image.');
            });
        } else {
            bot.sendMessage(chatId, '📷 Please send an image.');
        }
    }
}
