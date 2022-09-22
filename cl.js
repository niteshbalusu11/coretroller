#!/usr/bin/env node

import { askPaths } from './core-lightning/index.js';
import { interrogate } from './commands/index.js';
import prog from '@alexbosworth/caporal';
import { readFileSync } from 'fs';

const loadJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));

prog
  .version(loadJSON('./package.json').version)

  .command('connect')
  .description('Connect and authenticate to a core lightning node')
  .action(async (args, options, logger) => {
    try {
      await askPaths({
        logger,
        ask: await interrogate({}),
      });
    } catch (err) {
      throw new Error(err);
    }
  });

// eslint-disable-next-line no-undef
prog.parse(process.argv);
