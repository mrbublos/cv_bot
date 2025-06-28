import { Action, ActionContext } from './baseAction';
import { s3Client } from '../s3/s3';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../db/database';
import TelegramBot from 'node-telegram-bot-api';

export class ImageUploadAction extends Action {
    public execute(context: ActionContext): void {
        const { bot, msg, user } = context;
        const chatId = msg.chat.id;
        const userId = user.id;

        if (msg.photo && msg.photo.length > 0) {
            const photo = msg.photo[msg.photo.length - 1];
            const fileStream = bot.getFileStream(photo.file_id);
            const fileName = `${uuidv4()}.jpg`;

            fileStream.on('data', async (chunk) => {
                try {
                    const s3Url = await s3Client.save(fileName, chunk);
                    await this.db.addUserImage(userId, s3Url);
                    bot.sendMessage(chatId, `Image uploaded successfully! You can view it here: ${s3Url}`);
                } catch (error) {
                    console.error(error);
                    bot.sendMessage(chatId, "Sorry, there was an error uploading your image.");
                }
            });
        } else {
            bot.sendMessage(chatId, "Please send an image.");
        }
    }
}
