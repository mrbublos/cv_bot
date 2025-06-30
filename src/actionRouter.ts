import TelegramBot from 'node-telegram-bot-api';
import { Database, User } from './db/database';
import { Action, ActionContext } from './actions/baseAction';
import { StartAction } from './actions/startAction';
import { HelpAction } from './actions/helpAction';
import { ImageUploadAction } from './actions/imageUploadAction';
import { ClearAction } from './actions/clearAction';
import {JobManager} from "./jobs";

type ActionClass = new (db: Database, jobManager: JobManager, bot: TelegramBot) => Action;

export class ActionRouter {
  private db: Database;
  private jobManager: JobManager;
  private actions: { [key: string]: ActionClass };
  private bot: TelegramBot;

  constructor(db: Database, jobManager: JobManager, bot: TelegramBot) {
    this.db = db;
    this.jobManager = jobManager;
    this.bot = bot;
    this.actions = {
      '/start': StartAction,
      '/help': HelpAction,
      '/clear': ClearAction,
    };
  }

  getAction(msg: TelegramBot.Message, user: User): Action | null {
    const text = msg.text || '';
    const state = user.state;

    let actionClass: ActionClass | undefined;

    if (msg.photo) {
      return new ImageUploadAction(this.db, this.jobManager, this.bot);
    }

    // First, check for commands
    if (text.startsWith('/')) {
      actionClass = this.actions[text];
    }

    // If no command, check state-based actions (not implemented yet)
    // if (!actionClass) {
    //   // TODO: Add state-based routing
    // }

    if (actionClass) {
      return new actionClass(this.db, this.jobManager, this.bot);
    }

    return null;
  }
}
