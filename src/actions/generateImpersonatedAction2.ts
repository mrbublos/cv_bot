import {Action, ActionContext} from './baseAction';
import {getModelClient} from "../modelClients/modelClient";

export class GenerateImpersonatedAction2 extends Action {
    private modelClient = getModelClient();

    public async execute(context: ActionContext): Promise<void> {
        const { bot, msg, user } = context;
        const chatId = msg.chat.id.toString();
        const text = msg.text?.trim();

        const [command, impersonatedUser, link1, weight, link2, weight2, ...rest] = text?.split(' ') || [];
        if (!impersonatedUser) {
            await bot.sendMessage(chatId, 'Please provide a user ID to impersonate. Usage: /generate <user_id> <prompt>');
            return;
        }

        const userId = impersonatedUser;
        const prompt = rest.join(' ').trim();

        try {
            // Check if user has a trained model
            const trainingStatus = await this.db.getTrainingStatus(impersonatedUser);
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
                    prompt,
                    width: 1024,  // Default width
                    height: 1024, // Default height
                    loraStyles: [
                        { link: link1, weight: weight },
                        { link: link2, weight: weight2 }
                    ], // Empty array as stub
                    loraPersonal: true // Default to personal LoRA
                },
            });

            if (result.success) {
                this.bot.sendMessage(chatId, '⏳ Generating image as user ' + userId + '...');
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
