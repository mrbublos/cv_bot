import { Action, ActionContext } from './baseAction';
import { s3Client } from '../s3/s3';

export class ClearAction extends Action {
  async execute(context: ActionContext): Promise<void> {
    const { msg, user } = context;

    try {
      // Get confirmation from user
      const confirmationMessage = await this.bot.sendMessage(
        msg.chat.id,
        'Are you sure you want to clear all your data? This action cannot be undone.',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Yes, clear my data', callback_data: 'clear_confirm' },
                { text: 'No, keep my data', callback_data: 'clear_cancel' }
              ]
            ]
          }
        }
      );

      // Set up one-time callback query handler for the confirmation
      this.bot.once('callback_query', async (callbackQuery) => {
        if (!callbackQuery.message || callbackQuery.data === 'clear_cancel') {
          await this.bot.editMessageText(
            'Operation cancelled.',
            {
              chat_id: msg.chat.id,
              message_id: confirmationMessage.message_id
            }
          );
          return;
        }

        if (callbackQuery.data === 'clear_confirm') {
          await this.bot.editMessageText(
            'Clearing your data...',
            {
              chat_id: msg.chat.id,
              message_id: confirmationMessage.message_id
            }
          );

          try {
            // Delete S3 files first
            const imageFilenames = await this.db.extractImageFilenames(user.telegram_id);
            for (const filename of imageFilenames) {
              await s3Client.delete(filename);
            }

            // Delete database records
            await this.db.deleteUserImages(user.telegram_id);
            await this.db.deleteTrainingStatus(user.telegram_id);
            await this.db.deleteUser(user.telegram_id);

            await this.bot.sendMessage(
              msg.chat.id,
              'All your data has been successfully cleared. You can start fresh by using the /start command.'
            );
          } catch (error) {
            console.error('Error during clear operation:', error);
            await this.bot.sendMessage(
              msg.chat.id,
              'An error occurred while clearing your data. Please try again later or contact support.'
            );
          }
        }
      });
    } catch (error) {
      console.error('Error in clear action:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        'An error occurred while processing your request. Please try again later.'
      );
    }
  }
}
