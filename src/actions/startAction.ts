import { Action, ActionContext } from './baseAction';

export class StartAction extends Action {
  execute({ bot, msg }: ActionContext): void {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome! Please upload 10 selfies, so we can train our model. After that, you can generate images using the /generate command. ie: "/generate Young man near the tree"');
  }
}
