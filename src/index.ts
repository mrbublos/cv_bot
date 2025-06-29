import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { Database, User } from './db/database';
import { ActionRouter } from './actionRouter';
import { ModelClient } from './runpodModelClient';
import { initializeJobSystem } from './initJobs';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Telegram bot token not found. Please add it to your .env file.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const db = new Database('bot.db');
const jobManager = await initializeJobSystem(db);
const actionRouter = new ActionRouter(db, jobManager);

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    return;
  }

  let user: User | undefined = await db.getUser(userId);
  if (!user) {
    await db.createUser(userId);
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
