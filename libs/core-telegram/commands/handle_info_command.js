import { auto, map } from 'async';

import { checkAccess } from '../authentication/index.js';
import { getInfo } from '../../../core-lightning/methods.js';
import { icons } from '../constants.js';
import { returnResult } from 'asyncjs-util';

const escape = text => text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
const { isArray } = Array;
const join = arr => arr.join('\n');
const markup = { parse_mode: 'MarkdownV2' };

/** Get node info
  Syntax of command:
  /info
  {
    from: <Command From User Id Number>
    id: <Connected User Id Number>
    nodes: [{
      from: <From Name String>
      ln: <Authenticated CoreLn API Object>
      public_key: <Public Key Hex String>
    }]
    remove: <Remove Function>
    reply: <Reply Function>
  }
*/
const handleInfoCommand = ({ from, id, nodes, remove, reply }, cbk) => {
  return new Promise((resolve, reject) => {
    return auto(
      {
        // Check arguments
        validate: cbk => {
          if (!from) {
            return cbk([400, 'ExpectedFromUserIdNumberForInfoCommand']);
          }

          if (!isArray(nodes)) {
            return cbk([400, 'ExpectedArrayOfNodesForInfoCommand']);
          }

          if (!remove) {
            return cbk([400, 'ExpectedRemoveFunctionForInfoCommand']);
          }

          if (!reply) {
            return cbk([400, 'ExpectedReplyFunctionForInfoCommand']);
          }

          return cbk();
        },

        // Authenticate the command caller is authorized to this command
        checkAccess: ['validate', ({}, cbk) => checkAccess({ from, id }, cbk)],

        // Remove the invocation command
        remove: ['validate', async ({}) => await remove()],

        // Get wallet info
        getInfo: [
          'checkAccess',
          async ({}) => {
            return await map(nodes, async ({ ln }) => await getInfo({ ln }));
          },
        ],

        // Derive a summary of the wallet info
        summary: [
          'getInfo',
          ({ getInfo }, cbk) => {
            const summary = getInfo.map(node => {
              const active = node.num_active_channels;
              const { alias } = node;
              const { version } = node;

              const channels = active === 1 ? 'active channel' : 'active channels';

              const elements = [
                `${icons.info} Info: ${escape(alias)} running ${escape(version)}`,
                `\`${node.id}\``,
                escape(`${active} ${channels}`),
                '',
              ];

              return join(elements);
            });

            return cbk(null, join(summary));
          },
        ],

        // Send response to telegram
        reply: [
          'summary',
          async ({ summary }) => {
            return await reply(summary, markup);
          },
        ],
      },
      returnResult({ reject, resolve }, cbk)
    );
  });
};

export default handleInfoCommand;
