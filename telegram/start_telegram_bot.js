import { auto, map } from 'async';
import {
  handleButtonPush,
  handleConnectCommand,
  handleEditedMessage,
  handleInfoCommand,
  handleStartCommand,
  handleStopCommand,
  handleVersionCommand,
  postNodesOnline,
} from '../libs/core-telegram/index.js';

// import { InputFile } from 'grammy';
import { getInfo } from '../core-lightning/methods.js';
import { readFileSync } from 'fs';
import { returnResult } from 'asyncjs-util';

const fromName = node => `${node.alias} ${node.public_key.substring(0, 8)}`;
const { isArray } = Array;
let isBotInit = false;
const interactions = './interaction.json';
const isNumber = n => !isNaN(n);
const loadJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
// const fileAsDoc = file => new InputFile(file.source, file.filename);

// const isHash = n => /^[0-9A-F]{64}$/i.test(n);
// const limit = 99999;
const markdown = { parse_mode: 'Markdown' };
// const maxCommandDelayMs = 1000 * 10;
// const restartSubscriptionTimeMs = 1000 * 30;
const packageJson = './../package.json';
const sanitize = n => (n || '').replace(/_/g, '\\_').replace(/[*~`]/g, '');

/** Start a Telegram bot

  {
    ask: <Ask Function>
    bot: <Telegram Bot Object>
    [id]: <Authorized User Id Number>
    key: <Telegram API Key String>
    [min_forward_tokens]: <Minimum Forward Tokens To Notify Number>
    coreLns: [<Authenticated CoreLn API Object>]
    nodes: [<Saved Nodes String>]
    logger: <Winston Logger Object>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    [connected]: <Connected User Id Number>
    failure: <Termination Error Object>
  }
*/
const startTelegramBot = (args, cbk) => {
  let connectedId = args.id;
  let isStopped = false;
  const subscriptions = [];

  return new Promise((resolve, reject) => {
    return auto(
      {
        // Check arguments
        validate: cbk => {
          if (!args.ask) {
            return cbk([400, 'ExpectedAskFunctionToStartTelegramBot']);
          }

          if (!isArray(args.coreLns) || !args.coreLns.length) {
            return cbk([400, 'ExpectedCoreLnsToStartTelegramBot']);
          }

          if (!args.key) {
            return cbk([400, 'ExpectedApiKeyToStartTelegramBot']);
          }

          if (!!args.id && args.key.startsWith(`${args.id}:`)) {
            return cbk([400, 'ExpectedConnectCodeFromConnectCommandNotBotId']);
          }

          if (!args.logger) {
            return cbk([400, 'ExpectedLoggerToStartTelegramBot']);
          }

          if (!isArray(args.nodes)) {
            return cbk([400, 'ExpectedArrayOfSavedNodesToStartTelegramBot']);
          }

          if (!args.request) {
            return cbk([400, 'ExpectedRequestMethodToStartTelegramBot']);
          }

          return cbk();
        },

        // Get node info
        getNodes: [
          'validate',
          async ({}) => {
            return await map(args.coreLns, async ({ ln }) => {
              try {
                const result = await getInfo({ ln });

                const named = fromName({
                  alias: result.alias,
                  public_key: result.id,
                });

                return {
                  ln,
                  alias: result.alias,
                  from: sanitize(named),
                  public_key: result.id,
                };
              } catch (err) {
                throw new Error('FailedToGetNodeInfo');
              }
            });
          },
        ],

        // Setup the bot start action
        initBot: [
          'getNodes',
          ({ getNodes }, cbk) => {
            // Exit early when the bot was already setup
            if (!!isBotInit) {
              return cbk();
            }

            args.bot.catch(err => args.logger.error({ telegram_error: err }));

            // Catch message editing
            args.bot.use(async (ctx, next) => {
              try {
                await handleEditedMessage({ ctx });
              } catch (err) {
                args.logger.error({ err });
              }

              return next();
            });

            // Handle command to get the connect id
            args.bot.command('connect', ctx => {
              handleConnectCommand({
                from: ctx.from.id,
                id: connectedId,
                reply: n => ctx.reply(n, markdown),
              });
            });

            // Handle command to look up wallet info
            args.bot.command('info', async ctx => {
              try {
                await handleInfoCommand({
                  from: ctx.message.from.id,
                  id: connectedId,
                  nodes: getNodes,
                  remove: () => ctx.deleteMessage(),
                  reply: (message, options) => ctx.reply(message, options),
                });
              } catch (err) {
                args.logger.error({ err });
              }
            });

            // Handle command to start the bot
            args.bot.command('start', ctx => {
              handleStartCommand({
                id: connectedId,
                reply: n => ctx.reply(n, markdown),
              });
            });

            // Terminate the running bot
            args.bot.command('stop', async ctx => {
              try {
                await handleStopCommand({
                  from: ctx.message.from.id,
                  id: connectedId,
                  reply: (msg, mode) => ctx.reply(msg, mode),
                });
              } catch (err) {
                args.logger.error({ err });
              }
            });

            // Handle command to view the current version
            args.bot.command('version', async ctx => {
              try {
                await handleVersionCommand({
                  from: ctx.message.from.id,
                  id: connectedId,
                  named: loadJSON(packageJson).name,
                  request: args.request,
                  reply: n => ctx.reply(n, markdown),
                  version: loadJSON(packageJson).version,
                });
              } catch (err) {
                args.logger.error({ err });
              }
            });

            // Handle command to get help with the bot
            args.bot.command('help', async ctx => {
              const commands = [
                '/backup - Get node backup file',
                '/blocknotify - Notification on next block',
                '/connect - Connect bot',
                '/costs - View costs over the past week',
                '/earnings - View earnings over the past week',
                '/graph <pubkey or peer alias> - Show info about a node',
                '/info - Show wallet info',
                '/invoice [amount] [memo] - Make an invoice',
                '/liquidity [with] - View node liquidity',
                '/mempool - BTC mempool report',
                '/pay - Pay an invoice',
                '/pending - View pending channels, probes, and forwards',
                '/stop - Stop bot',
                '/version - View the current bot version',
              ];

              try {
                await ctx.reply(`🤖\n${commands.join('\n')}`);
              } catch (err) {
                args.logger.error({ err });
              }
            });

            // Handle button push type commands
            args.bot.on('callback_query:data', async ctx => {
              try {
                await handleButtonPush({
                  ctx,
                  bot: args.bot,
                  id: connectedId,
                  nodes: getNodes,
                });
              } catch (err) {
                args.logger.error({ err });
              }
            });

            args.bot.start();

            // Avoid re-registering bot actions
            isBotInit = true;

            return cbk();
          },
        ],

        // Ask the user to confirm their user id
        userId: [
          'initBot',
          ({}, cbk) => {
            // Exit early when the id is specified
            if (!!connectedId) {
              return cbk();
            }

            return args.ask(
              {
                message: loadJSON(interactions).user_id_prompt.message,
                name: 'code',
                type: 'input',
                validate: input => {
                  if (!input) {
                    return false;
                  }

                  // The connect code should be entirely numeric, not an API key
                  if (!isNumber(input)) {
                    return 'Expected numeric connect code from /connect command';
                  }

                  // the connect code number should not match bot id from the API key
                  if (args.key.startsWith(`${input}:`)) {
                    return 'Expected /connect code, not bot id from API key';
                  }

                  return true;
                },
              },
              ({ code }) => {
                if (!code) {
                  return cbk([400, 'ExpectedConnectCodeToStartTelegramBot']);
                }

                connectedId = Number(code);

                return cbk();
              }
            );
          },
        ],

        // Setup the bot commands
        setCommands: [
          'validate',
          async ({}) => {
            return await args.bot.api.setMyCommands([
              { command: 'backup', description: 'Get node backup file' },
              { command: 'blocknotify', description: 'Get notified on next block' },
              { command: 'connect', description: 'Get connect code for the bot' },
              { command: 'costs', description: 'Show costs over the week' },
              { command: 'earnings', description: 'Show earnings over the week' },
              { command: 'graph', description: 'Show info about a node' },
              { command: 'help', description: 'Show the list of commands' },
              { command: 'info', description: 'Show wallet info' },
              { command: 'invoice', description: 'Create an invoice [amt] [memo]' },
              { command: 'liquidity', description: 'Get liquidity [with-peer]' },
              { command: 'mempool', description: 'Get info about the mempool' },
              { command: 'pay', description: 'Pay a payment request' },
              { command: 'pending', description: 'Get pending forwards, channels' },
              { command: 'stop', description: 'Stop the bot' },
              { command: 'version', description: 'View current bot version' },
            ]);
          },
        ],

        // Send connected message
        connected: [
          'getNodes',
          'userId',
          ({ getNodes }, cbk) => {
            args.logger.info({ is_connected: true });

            return postNodesOnline(
              {
                id: connectedId,
                nodes: getNodes.map(n => ({ alias: n.alias, id: n.public_key })),
                send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
              },
              cbk
            );
          },
        ],
      },
      // eslint-disable-next-line no-unused-vars
      (err, res) => {
        // Signal to fetch based polling that it should stop
        isStopped = true;

        // Cancel all open subscriptions
        subscriptions.forEach(n => n.removeAllListeners());

        const result = { result: { connected: connectedId, failure: err } };

        return returnResult({ reject, resolve, of: 'result' }, cbk)(null, result);
      }
    );
  });
};

export default startTelegramBot;
