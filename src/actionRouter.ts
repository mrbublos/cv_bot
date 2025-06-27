import TelegramBot from 'node-telegram-bot-api';
import { Database, User } from './db/database';
import { Action, ActionContext } from './actions/baseAction';
import { StartAction } from './actions/startAction';
import { HelpAction } from './actions/helpAction';

type ActionClass = new (db: Database) => Action;

export class ActionRouter {
  private db: Database;
  private actions: { [key: string]: ActionClass };

  constructor(db: Database) {
    this.db = db;
    this.actions = {
      '/start': StartAction,
      '/help': HelpAction,
    };
  }

  getAction(msg: TelegramBot.Message, user: User): Action | null {
    const text = msg.text || '';
    const state = user.state;

    let actionClass: ActionClass | undefined;

    // First, check for commands
    if (text.startsWith('/')) {
      actionClass = this.actions[text];
    }

    // If no command, check state-based actions (not implemented yet)
    // if (!actionClass) {
    //   // TODO: Add state-based routing
    // }

    if (actionClass) {
      return new actionClass(this.db);
    }

    return null;
  }
}
