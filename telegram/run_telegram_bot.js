import { auto, map } from 'async';

import { getCoreLns } from '../core-lightning/index.js';
import { getInfo } from '../core-lightning/methods.js';
import { returnResult } from 'asyncjs-util';
import startTelegramBot from './start_telegram_bot.js';

const { isArray } = Array;

/** Run the telegram bot for a node or multiple nodes

  {
    ask: <Ask Function>
    bot: <Telegram Bot Object>
    fs: {
      getFile: <Get File Contents Function>
      [is_reset_state]: <Reset File Status Bool>
      makeDirectory: <Make Directory Function>
      writeFile: <Write File Function>
    }
    [id]: <Authorized User Id Number>
    key: <Telegram Bot API Key String>
    [min_forward_tokens]: <Minimum Forward Tokens To Notify Number>
    logger: <Winston Logger Object>
    nodes: [<Node Name String>]
    [proxy]: <Socks Proxy Agent Object>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    [connected]: <Connected Id Number>
    online: [{
      alias: <Node Alias String>
      id: <Node Public Key Id Hex String>
    }]
  }
*/
const runTelegramBot = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return auto(
      {
        // Check arguments
        validate: cbk => {
          if (!args.ask) {
            return cbk([400, 'ExpectedAskFunctionToRunTelegramBot']);
          }

          if (!args.bot) {
            return cbk([400, 'ExpectedTelegramBotToRunTelegramBot']);
          }

          if (!args.fs) {
            return cbk([400, 'ExpectedFilesystemMethodsToRunTelegramBot']);
          }

          if (!args.key) {
            return cbk([400, 'ExpectedApiKeyToRunTelegramBot']);
          }

          if (!args.logger) {
            return cbk([400, 'ExpectedWinstonLoggerToRunTelegramBot']);
          }

          if (!isArray(args.nodes)) {
            return cbk([400, 'ExpectedArrayOfSavedNodesToRunTelegramBot']);
          }

          if (!args.request) {
            return cbk([400, 'ExpectedRequestFunctionToRunTelegrambot']);
          }

          return cbk();
        },

        // Get associated Core LNs
        getCoreLns: [
          'validate',
          async ({}) => {
            return await getCoreLns({ nodes: args.nodes });
          },
        ],

        // Start the bot going
        startBot: [
          'getCoreLns',
          ({ getCoreLns }, cbk) => {
            args.logger.info({ connecting_to_telegram: args.nodes });

            return startTelegramBot(
              {
                ask: args.ask,
                bot: args.bot,
                coreLns: getCoreLns,
                fs: args.fs,
                id: args.id,
                key: args.key,
                min_forward_tokens: args.min_forward_tokens,
                logger: args.logger,
                nodes: args.nodes,
                payments_limit: args.payments_limit,
                proxy: args.proxy,
                request: args.request,
              },
              cbk
            );
          },
        ],

        // Check the CoreLns that they can connect
        getConnected: [
          'getCoreLns',
          'startBot',
          async () => {
            const { nodes } = args;

            const coreLns = await getCoreLns({ nodes });

            const withName = coreLns.map((coreln, i) => ({ coreln, node: (nodes || [])[i] }));

            return map(withName, async ({ coreln }) => {
              try {
                const wallet = await getInfo({ ln: coreln.ln });

                return wallet.id;
              } catch (err) {
                // Ignore errors
                return;
              }
            });
          },
        ],

        // Final set of connected nodes
        online: [
          'getConnected',
          'startBot',
          ({ getConnected, startBot }, cbk) => {
            // Report the failure that killed the bot
            if (!!startBot.failure) {
              args.logger.error({ err: startBot.failure });
            }

            return cbk(null, {
              connected: startBot.connected,
              online: getConnected.filter(n => !!n),
            });
          },
        ],
      },
      returnResult({ reject, resolve, of: 'online' }, cbk)
    );
  });
};

export default runTelegramBot;
