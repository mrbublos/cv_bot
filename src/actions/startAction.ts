import { Action, ActionContext } from './baseAction';

export class StartAction extends Action {
  execute({ bot, msg }: ActionContext): void {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome! This is the start command.');
  }
}
