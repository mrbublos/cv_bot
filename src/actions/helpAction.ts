import { Action, ActionContext } from './baseAction';

export class HelpAction extends Action {
  execute({ bot, msg }: ActionContext): void {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'This is the help command. Available commands: /start, /help');
  }
}
