import { Action, ActionContext } from './baseAction';
import { ModelClient } from '../modelClient';
import { Database } from '../db/database';
import { InputFile } from 'node-telegram-bot-api';

export class GenerateAction extends Action {
    private modelClient: ModelClient;

    constructor(db: Database, modelClient: ModelClient) {
        super(db);
        this.modelClient = modelClient;
    }

    public async execute(context: ActionContext): Promise<void> {
        const { bot, msg, user } = context;
        const chatId = msg.chat.id;
        const userId = user.id;
        const text = msg.text?.replace('/generate', '').trim();

        if (!text) {
            await bot.sendMessage(chatId, 'Please provide some text after the /generate command. Example: /generate a sunset over mountains');
            return;
        }

        try {
            // Check if user has a trained model
            const trainingStatus = await this.db.getTrainingStatus(userId);
            if (trainingStatus.status !== 'completed') {
                await bot.sendMessage(chatId, '❌ You need to complete model training before generating images. Please finish uploading your training images first.');
                return;
            }

            // Show typing indicator
            await bot.sendChatAction(chatId, 'typing');

            // Call the model's infer function
            const result = await this.modelClient.infer({
                userId,
                prompt: text,
                modelName: trainingStatus.modelName // Assuming modelName is stored in training status
            });

            if (result.success && result.imageData) {
                // Create a buffer from the byte array
                const imageBuffer = Buffer.from(result.imageData);
                
                // Send the image buffer directly
                await bot.sendPhoto(chatId, imageBuffer, {
                    caption: `🎨 Generated image for: "${text}"`
                });
            } else {
                throw new Error(result.error || 'Failed to generate image');
            }
        } catch (error) {
            console.error('Error generating image:', error);
            await bot.sendMessage(chatId, '❌ Sorry, there was an error generating your image. Please try again later.');
        }
    }
}
