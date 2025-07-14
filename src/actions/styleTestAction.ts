import { Action, ActionContext } from './baseAction';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {getModelClient} from "../modelClients/modelClient";
import {RunpodModelClient} from "../modelClients/runpodModelClient";

export class StyleTestAction extends Action {

  modelClient = new RunpodModelClient();

  public async execute(context: ActionContext): Promise<void> {
    const { bot, msg, user } = context;
    const chatId = msg.chat.id.toString();
    const userId = user.id.toString();

    const text = msg.text || ''
    const parts = text.split(' ');
    const [command, link, ...promptParts] = parts;
    const prompt = promptParts.join(' ');

    if (!link || !prompt) {
      bot.sendMessage(chatId, 'Please provide a link and a prompt. Usage: /download <link> <prompt>');
      return;
    }

    try {
      const result = await this.modelClient.checkStyle(prompt, link);

      if (!result.success) {
        console.error('Error downloading file:', result.error);
        bot.sendMessage(chatId, 'Sorry, there was an error checking style. Validate that the link is correct and does not require authentication (in incognito mode).');
        return;
      }

      await this.jobManager.createJob('check-style-status', { userId, chatId, jobId: result.jobId });
      await bot.sendMessage(chatId, `Creating matrix...`);
    } catch (error) {
      console.error('Error checking style:', error);
      bot.sendMessage(chatId, 'Error checking style. Please try again.');
    }
  }
}
