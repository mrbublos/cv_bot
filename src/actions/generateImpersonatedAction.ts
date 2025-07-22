import {Action, ActionContext} from './baseAction';
import {getModelClient} from "../modelClients/modelClient";

export class GenerateImpersonatedAction extends Action {
    private modelClient = getModelClient();

    public async execute(context: ActionContext): Promise<void> {
        const { bot, msg, user } = context;
        const chatId = msg.chat.id.toString();
        let userId = user.id.toString();
        const text = msg.text?.trim();

        const impersonatedUser = text?.split(' ')?.[1];
        if (!impersonatedUser) {
            await bot.sendMessage(chatId, 'Please provide a user ID to impersonate. Usage: /generate <user_id> <prompt>');
            return;
        }

        userId = impersonatedUser;

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
                userId: impersonatedUser,
                inputData: {
                    prompt: text,
                    width: 1024,  // Default width
                    height: 1024, // Default height
                    loraStyles: [], // Empty array as stub
                    loraPersonal: true // Default to personal LoRA
                },
            });

            if (result.success) {
                this.bot.sendMessage(chatId, '⏳ Generating image as user ' + impersonatedUser + '...');
                this.jobManager.createJob('generate-image', { impersonatedUser, chatId, jobId: result.jobId });
            } else {
                throw new Error(result.error || 'Failed to generate image');
            }
        } catch (error) {
            console.error('Error generating image:', error);
            await bot.sendMessage(chatId, '❌ Sorry, there was an error generating your image. Please try again later.');
        }
    }
}
