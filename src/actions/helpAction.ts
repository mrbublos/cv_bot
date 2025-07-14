import { Action, ActionContext } from './baseAction';

export class HelpAction extends Action {
  execute({ bot, msg }: ActionContext): void {
    const chatId = msg.chat.id;
    const helpText = `
Available commands:
- /start: Start or restart the bot
- /help: Show this help message
- /clear: Delete all your data from both database and storage
- /setdb: Set database path (admin only)
- /getdb: Get current database path (admin only)
- /test_style: Test style detection
   Example: "/test_style https://civitai.com/api/download/models/732922?type=Model&format=SafeTensor a lady with a cat"
   Only accept civitai.com links that do not require authentication (you can validate this by opening the link in incognito mode)
   You can get the link by opening the model page and copying the link from the "Download" button
   Make sure that base model is Flux.1 D

To use the bot:
1. Upload 10 selfies to train your personal model
2. Use the /generate command to create images with prompts
   Example: "/generate Young man near the tree"

Note: You must complete model training with 10 selfies before using /generate
    `;
    bot.sendMessage(chatId, helpText);
  }
}
