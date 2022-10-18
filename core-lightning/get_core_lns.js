import { auto, map } from 'async';

import authenticatedLn from './authenticated_ln.js';

const flatten = arr => [].concat(...arr);
const uniq = arr => Array.from(new Set(arr));

/** Get Authenticated Core Lightning Objects for specified nodes

  {
    [nodes]: <Node Name String> || [<Node Name String>]
  }

  @return via cbk or Promise
  {
    [<Authenticated CoreLn API Object>]
  }
*/
const getAuthenticatedLns = async ({ nodes }) => {
  return (
    await auto({
      // Get CodeLn object when savedNode is not specified
      getAuthenticatedLn: async () => {
        if (!!nodes && !!nodes.length) {
          return;
        }

        return await authenticatedLn({});
      },

      // Authenticated CoreLn Objects
      getAuthenticatedLns: async () => {
        if (!nodes || !nodes.length) {
          return;
        }

        const nodesList = uniq(flatten([nodes].filter(n => !!n)));

        return await map(nodesList, async node => {
          return await authenticatedLn({ node });
        });
      },

      // Return authenticated objects
      authenticatedLns: [
        'getAuthenticatedLn',
        'getAuthenticatedLns',
        ({ getAuthenticatedLn, getAuthenticatedLns }, cbk) => {
          if (!nodes || !nodes.length) {
            return cbk(null, [getAuthenticatedLn]);
          }

          return cbk(
            null,
            getAuthenticatedLns.map(n => n)
          );
        },
      ],
    })
  ).authenticatedLns;
};

export default getAuthenticatedLns;
