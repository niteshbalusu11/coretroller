import { auto, reflect } from 'async';

import { Bot } from 'grammy';
import getSocksProxy from './get_socks_proxy.js';
import { homePath } from '../storage/index.js';
import inquirer from 'inquirer';
import { readFileSync } from 'fs';

const botKeyFile = 'telegram_bot_api_key';
const interaction = './interaction.json';
const loadJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));

/** Get the Telegram Bot object

  {
    fs: {
      getFile: <Get File Contents Function>
      getFileStatus: <Get File Status Function>
      makeDirectory: <Make Directory Function>
      writeFile: <Write File Function>
    }
    [proxy]: <Proxy Details JSON File Path String>
  }

  @returns via cbk or Promise
  {
    bot: <Telegram Bot Object>
    key: <Telegram API Key String>
  }
*/
const getTelegramBot = async ({ fs, proxy }) => {
  return (
    await auto({
      // Check arguments
      validate: cbk => {
        if (!fs) {
          return cbk([400, 'ExpectedFileSystemMethodsToGetTelegramBot']);
        }

        return cbk();
      },

      // Ask for an API key
      apiKey: [
        'validate',
        ({}, cbk) => {
          return fs.getFile(homePath({ file: botKeyFile }).path, (err, res) => {
            // Exit early when resetting the API key
            if (!!err || !res || !res.toString() || !!fs.is_reset_state) {
              const token = loadJSON(interaction).api_token_prompt;

              inquirer.prompt([token]).then(({ key }) => cbk(null, { key }));

              return;
            }

            return cbk(null, { is_saved: true, key: res.toString() });
          });
        },
      ],

      // Get proxy agent
      getProxy: [
        'validate',
        async ({}) => {
          // Exit early if not using a proxy
          if (!proxy) {
            return;
          }

          return await getSocksProxy({ fs, path: proxy });
        },
      ],

      // Create the bot
      createBot: [
        'apiKey',
        'getProxy',
        ({ apiKey, getProxy }, cbk) => {
          const { key } = apiKey;

          // Exit early when there is no SOCKS proxy
          if (!getProxy) {
            return cbk(null, { key, bot: new Bot(key) });
          }

          // Initiate bot using proxy agent when configured
          const bot = new Bot(key, {
            client: { baseFetchConfig: { agent: getProxy.agent, compress: true } },
          });

          return cbk(null, { bot, key });
        },
      ],

      // Test the created bot
      test: [
        'createBot',
        async ({ createBot }) => {
          // Start the bot
          return await createBot.bot.init();
        },
      ],

      // Make the home directory if it's not already present
      makeDir: [
        'apiKey',
        'test',
        reflect(({}, cbk) => {
          return fs.makeDirectory(homePath({}).path, cbk);
        }),
      ],

      // Save the bot API key so it doesn't need to be entered next run
      saveKey: [
        'apiKey',
        'makeDir',
        ({ apiKey }, cbk) => {
          // Exit early when API key is already saved
          if (!!apiKey.is_saved) {
            return cbk();
          }

          const { path } = homePath({ file: botKeyFile });

          // Ignore errors when making directory, it may already be present
          return fs.writeFile(path, apiKey.key, err => {
            if (!!err) {
              return cbk([503, 'FailedToSaveTelegramApiToken', { err }]);
            }

            return cbk();
          });
        },
      ],
    })
  ).createBot;
};

export default getTelegramBot;
