import TelegramBot from 'node-telegram-bot-api';
import {Database, User} from './db/database';
import {ActionRouter} from './actionRouter';
import {initializeJobSystem} from './initJobs';
import {config} from "./config";

if (!config.telegram.token) {
  console.error('Telegram bot token not found. Please add it to your .env file.');
  process.exit(1);
}

const bot = new TelegramBot(config.telegram.token, { polling: true });
const db = new Database(config.db.path!);
const jobManager = initializeJobSystem(db, bot);
const actionRouter = new ActionRouter(db, jobManager, bot);

bot.on('message', async (msg) => {
  const chatId = msg.chat.id?.toString();
  const userId = msg.from?.id?.toString();

  if (!userId) {
    return;
  }

  let user: User | undefined = await db.getUser(userId);
  if (!user) {
    await db.createUser(userId, chatId);
    user = await db.getUser(userId);
  }

  if (user) {
    const action = actionRouter.getAction(msg, user);
    if (action) {
      action.execute({ bot, msg, user });
    } else {
      bot.sendMessage(chatId, "I don't understand that command.");
    }
  } else {
    // This should not happen, but it's good practice to handle it.
    bot.sendMessage(chatId, "Could not find or create user.");
  }
});

console.log('Bot started...');
