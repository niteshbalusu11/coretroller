import { callbackCommands, icons, labels } from '../constants.js';

import { InlineKeyboard } from 'grammy';

const { removeMessage } = callbackCommands;
const { terminateBot } = callbackCommands;
const { stopBotCancelButtonLabel } = labels;
const { stopBotConfirmButtonLabel } = labels;
const mode = 'MarkdownV2';

/** Create a stop bot message
  {}
  @returns
  {
    markup: <Reply Markup Object>
    mode: <Message Parse Mode String>
    text: <Message Text String>
  }
*/
// eslint-disable-next-line no-unused-vars
const stopBotMessage = args => {
  const markup = new InlineKeyboard();

  markup.text(stopBotCancelButtonLabel, terminateBot);
  markup.text(stopBotConfirmButtonLabel, removeMessage);

  const text = `${icons.bot} Are you sure that you want to stop the bot?`;

  return { markup, mode, text };
};

export default stopBotMessage;
