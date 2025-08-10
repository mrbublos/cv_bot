import { Action, ActionContext } from './baseAction';
import { Database } from '../db/database';
import TelegramBot from 'node-telegram-bot-api';

export class CompleteTrainingAction extends Action {
  async execute(context: ActionContext): Promise<void> {
    const { msg, user } = context;

    try {
      // Mark training as completed in the database
      await this.db.completeTraining(user.id.toString());
      
      // Send confirmation message to the user
      await this.bot.sendMessage(
        msg.chat.id,
        '✅ Training has been marked as completed successfully!',
        { reply_to_message_id: msg.message_id }
      );
      
      console.log(`Training marked as completed for user ${user.telegram_id}`);
    } catch (error) {
      console.error('Error completing training:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Failed to mark training as completed. Please try again later.',
        { reply_to_message_id: msg.message_id }
      );
    }
  }
}
