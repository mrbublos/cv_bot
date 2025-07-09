import { Action, ActionContext } from './baseAction';
import fs from 'fs';
import path from 'path';
import { config } from "../config";

export class GetDbAction extends Action {
  async execute(context: ActionContext): Promise<void> {
    const { bot, msg } = context;
    const currentDbPath = config.db.path!;

    // Check if the database file exists
    if (!fs.existsSync(currentDbPath)) {
      await bot.sendMessage(
        msg.chat.id,
        'Database file not found. Please set up a database first using /setdb.'
      );
      return;
    }

    try {
      // Read the database file
      const fileStream = fs.createReadStream(currentDbPath);
      const filename = path.basename(currentDbPath);
      
      // Send the database file to the user
      await bot.sendDocument(
        msg.chat.id,
        fileStream,
        {},
        {
          filename: filename,
          contentType: 'application/x-sqlite3'
        }
      );
      
      await bot.sendMessage(
        msg.chat.id,
        'Here is your current database file.'
      );
    } catch (error) {
      console.error('Error sending database file:', error);
      await bot.sendMessage(
        msg.chat.id,
        'An error occurred while trying to send the database file.'
      );
    }
  }
}
