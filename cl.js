#!/usr/bin/env node

import { askPaths, authenticatedCoreLightning } from './core-lightning/index.js';

import PrettyError from 'pretty-error';
import { getBalance } from './balances/index.js';
import { interrogate } from './commands/index.js';
import prog from '@alexbosworth/caporal';
import { readFileSync } from 'fs';

const pe = new PrettyError();

const loadJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));

prog
  .version(loadJSON('./package.json').version)

  .command('connect', 'Connect a new node')
  .help('Connect and authenticate to a core lightning node')
  .action(async (args, options, logger) => {
    try {
      return await askPaths({
        logger,
        ask: await interrogate({}),
      });
    } catch (err) {
      throw new Error(pe.render(err));
    }
  })

  .command('balance', 'Get total tokens')
  .help('Sums balances on-chain, in channels, and pending, plus commit fees')
  .option('--confirmed', 'Return confirmed funds only')
  .option('--detailed', 'Return detailed balance information')
  .option('--node <node_name>', 'Node to get balance for')
  .option('--offchain', 'List only off-chain tokens')
  .option('--onchain', 'List only on-chain tokens')
  .action(async (args, options, logger) => {
    try {
      const result = await getBalance({
        lightning: (await authenticatedCoreLightning({ node: options.node })).lightning,
        is_confirmed: !!options.confirmed,
        is_detailed: !!options.detailed,
        is_offchain_only: !!options.offchain,
        is_onchain_only: !!options.onchain,
      });

      return logger.info(result);
    } catch (err) {
      throw new Error(pe.render(err));
    }
  });

// eslint-disable-next-line no-undef
prog.parse(process.argv);
