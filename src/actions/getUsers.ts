import {Action, ActionContext} from './baseAction';

export class GetUsersAction extends Action {
  async execute(context: ActionContext): Promise<void> {
    const { bot, msg } = context;
    try {
      const result = await this.db.getUsers();
      
      await bot.sendMessage(
        msg.chat.id,
        `Here is your current database file.\n ${result.map(it => `${it.id} ${it.telegram_id}`).join('\n')}`
      );
    } catch (error) {
      console.error('Error getting users:', error);
      await bot.sendMessage(
        msg.chat.id,
        'An error occurred while trying to send users list.'
      );
    }
  }
}
