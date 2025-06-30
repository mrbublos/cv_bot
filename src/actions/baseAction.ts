import TelegramBot from 'node-telegram-bot-api';
import {Database, User} from '../db/database';
import {JobManager} from "../jobs/jobManager";

export interface ActionContext {
  bot: TelegramBot;
  msg: TelegramBot.Message;
  user: User;
}

export abstract class Action {
  protected db: Database;
  protected jobManager: JobManager;
  protected bot: TelegramBot;

  constructor(db: Database, jobManager: JobManager, bot: TelegramBot) {
    this.db = db;
    this.jobManager = jobManager;
    this.bot = bot;
  }

  abstract execute(context: ActionContext): void;
}
