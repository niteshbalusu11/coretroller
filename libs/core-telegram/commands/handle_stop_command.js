import { auto } from 'async';
import { checkAccess } from './../authentication/index.js';
import { returnResult } from 'asyncjs-util';
import { stopBotMessage } from './../messages/index.js';

/** Execute stop command to stop the bot
  {
    from: <Command From User Id Number>
    id: <Connected User Id Number>
    quit: <Stop Bot Function>
    reply: <Reply Function>
  }
  @returns via cbk or Promise
*/
const handleStopCommand = ({ from, id, reply }, cbk) => {
  return new Promise((resolve, reject) => {
    return auto(
      {
        // Check arguments
        validate: cbk => {
          if (!from) {
            return cbk([400, 'ExpectedFromUserIdToExecuteStopCommand']);
          }

          if (!reply) {
            return cbk([400, 'ExpectedReplyFunctionToExecuteStopCommand']);
          }

          return cbk();
        },

        // Confirm the connected user issued the command
        checkAccess: ['validate', ({}, cbk) => checkAccess({ from, id }, cbk)],

        // Notify the chat that the bot would stop
        notify: [
          'checkAccess',
          async ({}) => {
            const { markup, mode, text } = stopBotMessage({});

            return await reply(text, { parse_mode: mode, reply_markup: markup });
          },
        ],
      },
      returnResult({ reject, resolve }, cbk)
    );
  });
};

export default handleStopCommand;
