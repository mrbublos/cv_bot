import {Action, ActionContext} from './baseAction';
import fs from 'fs';
import path from 'path';
import {config} from "../config";

export class SetDbAction extends Action {
  async execute(context: ActionContext): Promise<void> {
    const { msg } = context;

    // Check if the message contains a document
    if (!msg.document) {
      await this.bot.sendMessage(
        msg.chat.id,
        'Please upload an SQLite database file (.db or .sqlite) to replace the current database.'
      );
      return;
    }

    const fileId = msg.document.file_id;
    const file = await this.bot.getFile(fileId);
    const fileExt = path.extname(file.file_path || '').toLowerCase();

    // Check if the file is a valid SQLite database
    if (fileExt !== '.db' && fileExt !== '.sqlite' && fileExt !== '.sqlite3') {
      await this.bot.sendMessage(
        msg.chat.id,
        'Invalid file type. Please upload a valid SQLite database file (.db, .sqlite, or .sqlite3).'
      );
      return;
    }

    try {
      // Download the file
      const response = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
      if (!response.ok) throw new Error('Failed to download the file');
      
      const fileBuffer = await response.arrayBuffer();
      const currentDbPath = path.join(process.cwd(), config.db.path!);
      const backupPath = path.join(process.cwd(), `bot_backup_${Date.now()}.db`);
      
      // Backup the current database if it exists
      if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, backupPath);
      }
      
      // Save the new database file
      fs.writeFileSync(currentDbPath, Buffer.from(fileBuffer));
      
      await this.bot.sendMessage(
        msg.chat.id,
        '✅ Database successfully updated!\n' +
        'A backup of the previous database has been created.'
      );
      
    } catch (error) {
      console.error('Error updating database:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Failed to update the database. Please try again.'
      );
    }
  }
}
