import TelegramBot from 'node-telegram-bot-api';
import {Database, User} from './db/database';
import {Action} from './actions/baseAction';
import {StartAction} from './actions/startAction';
import {HelpAction} from './actions/helpAction';
import {ImageUploadAction} from './actions/imageUploadAction';
import {ClearAction} from './actions/clearAction';
import {SetDbAction} from './actions/setDbAction';
import {GetDbAction} from './actions/getDbAction';
import {JobManager} from "./jobs/jobManager";
import {GenerateAction} from "./actions/generateAction";
import {StyleTestAction} from "./actions/styleTestAction";
import {GenerateImpersonatedAction} from "./actions/generateImpersonatedAction";
import {GetUsersAction} from "./actions/getUsers";
import {StyleTestArinaAction} from "./actions/styleTestArinaAction";

type ActionClass = new (db: Database, jobManager: JobManager, bot: TelegramBot) => Action;

export class ActionRouter {
  private readonly db: Database;
  private readonly jobManager: JobManager;
  private readonly actions: { [key: string]: ActionClass };
  private readonly bot: TelegramBot;

  constructor(db: Database, jobManager: JobManager, bot: TelegramBot) {
    this.db = db;
    this.jobManager = jobManager;
    this.bot = bot;
    this.actions = {
      '/start': StartAction,
      '/help': HelpAction,
      '/clear': ClearAction,
      '/setdb': SetDbAction,
      '/getdb': GetDbAction,
      '/test_style': StyleTestAction,
      '/test_style_arina': StyleTestArinaAction,
      '/generate': GenerateImpersonatedAction,
      '/get_users': GetUsersAction,
    };
  }

  getAction(msg: TelegramBot.Message, user: User): Action | null {
    const text = msg.text || '';
    const state = user.state;

    let actionClass: ActionClass | undefined;

    // First, check for commands
    if (text.startsWith('/')) {
      const command = text.split(' ')[0];
      actionClass = this.actions[command];
    }

    if (!actionClass && msg.photo) {
      return new ImageUploadAction(this.db, this.jobManager, this.bot);
    }

    if (actionClass) {
      return new actionClass(this.db, this.jobManager, this.bot);
    }

    return new GenerateAction(this.db, this.jobManager, this.bot);
  }
}
