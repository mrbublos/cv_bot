import TelegramBot from 'node-telegram-bot-api';
import { Database, User } from '../db/database';

export interface ActionContext {
  bot: TelegramBot;
  msg: TelegramBot.Message;
  user: User;
}

export abstract class Action {
  protected db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  abstract execute(context: ActionContext): void;
}
