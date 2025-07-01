import {Action, ActionContext} from './baseAction';
import {RunpodModelClient} from "../modelClients/runpodModelClient";

export class GenerateAction extends Action {
    private modelClient = new RunpodModelClient();

    public async execute(context: ActionContext): Promise<void> {
        const { bot, msg, user } = context;
        const chatId = msg.chat.id.toString();
        const userId = user.id.toString();
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

            // Call the model's infer function with proper parameters
            const result = await this.modelClient.infer({
                userId,
                inputData: {
                    prompt: text,
                    width: 512,  // Default width
                    height: 512, // Default height
                    loraStyles: [], // Empty array as stub
                    loraPersonal: true // Default to personal LoRA
                },
            });

            if (result.success) {
                this.jobManager.createJob('generate-image', { userId, chatId, jobId: result.jobId });
            } else {
                throw new Error(result.error || 'Failed to generate image');
            }
        } catch (error) {
            console.error('Error generating image:', error);
            await bot.sendMessage(chatId, '❌ Sorry, there was an error generating your image. Please try again later.');
        }
    }
}
