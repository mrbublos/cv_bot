import { Action, ActionContext } from './baseAction';

export class HelpAction extends Action {
  execute({ bot, msg }: ActionContext): void {
    const chatId = msg.chat.id;
    const helpText = `
Available commands:
- /start: Start or restart the bot
- /help: Show this help message
- /clear: Delete all your data from both database and storage
    `;
    bot.sendMessage(chatId, helpText);
  }
}
