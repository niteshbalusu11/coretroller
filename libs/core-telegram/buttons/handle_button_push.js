import { auto } from 'async';
import { callbackCommands } from '../constants.js';
import { checkAccess } from '../authentication/index.js';
/* eslint-disable indent */
import { returnResult } from 'asyncjs-util';
import terminateBot from './terminate_bot.js';
import warnUnknownButton from './warn_unknown_button.js';

const { exit } = process;
const { isArray } = Array;

/** Respond to a button push on a message
  {
    bot: <Telegram Bot Object>
    ctx: <Telegram Context Object>
    id: <Connected Telegram User Id Number>
    nodes: [{
      from: <Saved Node Name String>
      lnd: <Authenticated LND API Object>
      public_key: <Public Key Hex String>
    }]
  }
  @returns via cbk or Promise
*/
const handleButtonPush = ({ bot, ctx, id, nodes }, cbk) => {
  return new Promise((resolve, reject) => {
    return auto(
      {
        // Check arguments
        validate: cbk => {
          if (!bot) {
            return cbk([400, 'ExpectedTelegramBotToHandleButtonPushEvent']);
          }

          if (!ctx) {
            return cbk([400, 'ExpectedTelegramContextToHandleButtonPushEvent']);
          }

          if (!id) {
            return cbk([400, 'ExpectedConnectedUserIdToHandleButtonPushEvent']);
          }

          if (!isArray(nodes)) {
            return cbk([400, 'ExpectedArrayOfNodesToHandleButtonPushEvent']);
          }

          return cbk();
        },

        // Confirm access authorization
        checkAccess: [
          'validate',
          ({}, cbk) => {
            return checkAccess({ id, from: ctx.update.callback_query.from.id }, cbk);
          },
        ],

        // Find button command type
        type: [
          'checkAccess',
          ({}, cbk) => {
            const { data } = ctx.update.callback_query;

            // Moving invoice has the button name as a prefix
            if (data.startsWith(callbackCommands.moveInvoiceNode)) {
              return cbk(null, callbackCommands.moveInvoiceNode);
            }

            // Moving a trade has the button name as a prefix
            if (data.startsWith(callbackCommands.moveTradeNode)) {
              return cbk(null, callbackCommands.moveTradeNode);
            }

            return cbk(null, data);
          },
        ],

        // Perform button action based on type
        action: [
          'type',
          ({ type }, cbk) => {
            switch (type) {
              // Pressed to terminate the bot
              case callbackCommands.terminateBot:
                return terminateBot({ bot, ctx, exit }, cbk);

              // Pressed something unknown
              default:
                return warnUnknownButton({ ctx }, cbk);
            }
          },
        ],
      },
      returnResult({ reject, resolve }, cbk)
    );
  });
};

export default handleButtonPush;
