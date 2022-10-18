#!/usr/bin/env node

import { askLnSocketCredentials, authenticatedLn } from './core-lightning/index.js';
import { fetchRequest, interrogate } from './commands/index.js';
import { mkdir, readFile, statSync, writeFile } from 'fs';

import PrettyError from 'pretty-error';
import { adjustTags } from './nodes/index.js';
import { connectToTelegram } from './telegram/index.js';
import fetch from '@alexbosworth/node-fetch';
import { getBalance } from './balances/index.js';
import { getDepositAddress } from './chain/index.js';
import prog from '@alexbosworth/caporal';
import { readFileSync } from 'fs';
import { returnObject } from './responses/index.js';

const { BOOL } = prog;
const flatten = arr => [].concat(...arr);
const { INT } = prog;
const pe = new PrettyError();
const { REPEATABLE } = prog;

const loadJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));

prog
  .version(loadJSON('./package.json').version)

  // Get local balance information
  .command('balance', 'Get total tokens')
  .help('Sums balances on-chain, in channels, and pending, plus commit fees')
  .option('--confirmed', 'Return confirmed funds only')
  .option('--detailed', 'Return detailed balance information')
  .option('--node <node_name>', 'Node to get balance for')
  .option('--offchain', 'List only off-chain tokens')
  .option('--onchain', 'List only on-chain tokens')
  .action(async (args, options, logger) => {
    try {
      const ln = (await authenticatedLn({ node: options.node })).ln;

      const result = await getBalance({
        ln,
        is_confirmed: !!options.confirmed,
        is_detailed: !!options.detailed,
        is_offchain_only: !!options.offchain,
        is_onchain_only: !!options.onchain,
      });

      ln.destroy();
      return returnObject({ logger, result });
    } catch (err) {
      logger.error(err);
      throw new Error(pe.render(err));
    }
  })

  // Deposit coins
  .command('chain-deposit', 'Deposit coins in the on-chain wallet')
  .help('--format address types supported: np2wpkh, p2tr, p2wpkh (default)')
  .argument('[amount]', 'Amount to receive', INT)
  .option('--format <format>', 'Address type', ['np2wpkh', 'p2wpkh'])
  .option('--node <node_name>', 'Node to deposit coins to')
  .action(async (args, options, logger) => {
    try {
      const ln = (await authenticatedLn({ node: options.node })).ln;

      const result = await getDepositAddress({
        ln,
        format: options.format || undefined,
        tokens: args.amount,
      });

      ln.destroy();
      return returnObject({ logger, result });
    } catch (err) {
      logger.error(err);
      throw new Error(pe.render(err));
    }
  })

  // Initiate connection to a core-lightning node
  .command('connect', 'Connect a new node')
  .help('Connect and authenticate to a core lightning node')
  .action(async (args, options, logger) => {
    try {
      return await askLnSocketCredentials({
        logger,
        ask: await interrogate({}),
      });
    } catch (err) {
      logger.error(err);
      throw new Error(pe.render(err));
    }
  })

  // Adjust the set of tagged nodes
  .command('tags', 'View or adjust the set of tagged nodes')
  .help('Tags can be used in other commands via --tag and --avoid options')
  .argument('[tag]', 'Adjust or view a specific tag')
  .option('--add <public_key', 'Add a public key to a tag', REPEATABLE)
  .option('--avoid', 'Mark to globally avoid all tagged nodes', BOOL, true)
  .option('--icon <icon>', 'Icon to use for the tag')
  .option('--remove <public_key>', 'Remove a public key from a tag', REPEATABLE)
  .action(async (args, options, logger) => {
    try {
      const result = await adjustTags({
        add: flatten([options.add].filter(n => !!n)),
        fs: { writeFile, getFile: readFile, makeDirectory: mkdir },
        icon: options.icon,
        is_avoided: options.avoid,
        remove: flatten([options.remove].filter(n => !!n)),
        tag: !!args.tag ? args.tag.toLowerCase() : undefined,
      });

      return returnObject({ logger, result });
    } catch (err) {
      logger.error(err);
      throw new Error(pe.render(err));
    }
  })

  // Link up Telegram bot
  .command('telegram', 'Post updates to a Telegram bot')
  .help('Connect to a Telegram bot. Create bot: tg://resolve?domain=botfather')
  .help('After creating the bot start chatting with the bot for connect code')
  .help('Supported updates: forwards, received payments, etc')
  .help('Multiple nodes are supported by repeating the `--node` flag')
  .help('See README for info on persisting the bot through Docker/nohup')
  .help('--use-proxy requires path to JSON file for host/password/port/userId')
  .option('--connect <connect_code>', 'Connection code from /connect')
  .option('--ignore-forwards-below <amount>', 'Ignore forwards of value', INT)
  .option('--node <node_name>', 'Node to connect to Telegram', REPEATABLE)
  .option('--reset-api-key', 'Reset the Telegram API key')
  .option('--use-proxy <path>', 'Proxy agent to connect to Telegram')
  .option('--use-small-units', 'Avoid showing leading zeros on amounts')
  .action(async (args, options, logger) => {
    try {
      const result = await connectToTelegram({
        logger,
        ask: await interrogate({}),
        fs: {
          writeFile,
          getFile: readFile,
          getFileStatus: statSync,
          is_reset_state: options.resetApiKey || undefined,
          makeDirectory: mkdir,
        },
        id: options.connect,
        is_small_units: options.useSmallUnits || undefined,
        min_forward_tokens: options.ignoreForwardsBelow || undefined,
        nodes: flatten([options.node].filter(n => !!n)),
        proxy: options.useProxy || undefined,
        request: fetchRequest({ fetch }),
      });

      return returnObject({ logger, result });
    } catch (err) {
      logger.error(err);
      throw new Error(pe.render(err));
    }
  });

prog.parse(process.argv);
