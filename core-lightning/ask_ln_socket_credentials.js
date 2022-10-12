import { auto } from 'async';
import putLnSocketCredentials from './put_ln_socket_credentials.js';

const defaultSavedNodeName = 'coreln';
const isPublicKey = n => !!n && /^0[2-3][0-9A-F]{64}$/i.test(n);

/** Ask Ln Socket credentials

  {
    ask: <Inquirer Ask Function>
    logger: <Winston Logger Object>
  }

  @Returns via Promise
 */
const askLnSocketCredentials = async ({ ask, logger }) => {
  return await auto({
    // Check arguments
    validate: cbk => {
      if (!ask) {
        return cbk([400, 'ExpectedAskFunctionForAskingLnSocketCredentials']);
      }

      if (!logger) {
        return cbk([400, 'ExpectedWinstonLoggerObjectForAskingLnSocketCredentials']);
      }

      return cbk();
    },

    // Ask client.pem path
    askPublicKey: [
      'validate',
      ({}, cbk) => {
        return ask(
          {
            message: 'Enter public key',
            name: 'pubkey',
            type: 'input',
            validate: input => {
              if (!input) {
                return false;
              }

              if (!isPublicKey(input)) {
                return 'Expected valid public key';
              }

              return true;
            },
          },
          ({ pubkey }) => {
            if (!pubkey) {
              return cbk([400, 'ExpectedPublicKeyToSaveLnSocketCredentials']);
            }

            return cbk(null, pubkey);
          }
        );
      },
    ],

    askSocket: [
      'askPublicKey',
      ({}, cbk) => {
        return ask(
          {
            message: 'Enter socket',
            name: 'socket',
            type: 'input',
            validate: input => {
              if (!input) {
                return false;
              }

              return true;
            },
          },
          ({ socket }) => {
            if (!socket) {
              return cbk([400, 'ExpectedSocketToSaveLnSocketCredentials']);
            }

            return cbk(null, socket);
          }
        );
      },
    ],

    askRune: [
      'askSocket',
      ({}, cbk) => {
        return ask(
          {
            message: 'Enter commando rune',
            name: 'rune',
            type: 'input',
            validate: input => {
              if (!input) {
                return false;
              }

              return true;
            },
          },
          ({ rune }) => {
            if (!rune) {
              return cbk([400, 'ExpectedCommandoRuneToSaveLnSocketCredentials']);
            }

            return cbk(null, rune);
          }
        );
      },
    ],

    // Ask saved node name
    askSavedNodeName: [
      'askRune',
      ({}, cbk) => {
        return ask(
          {
            default: defaultSavedNodeName,
            message: 'Enter a saved node name (can be one word random lowercase)',
            name: 'name',
            type: 'input',
            validate: input => {
              if (!input) {
                return false;
              }

              return true;
            },
          },
          ({ name }) => {
            if (!name) {
              return cbk([400, 'ExpectedSavedNodeNameToSaveLnSocketCredentials']);
            }

            return cbk(null, name);
          }
        );
      },
    ],

    // Ask if saved node is default
    askisDefault: [
      'askSavedNodeName',
      ({}, cbk) => {
        return ask(
          {
            message: 'Is this the default node?',
            name: 'ok',
            type: 'confirm',
            default: true,
          },
          ({ ok }) => {
            return cbk(null, ok);
          }
        );
      },
    ],

    // Write credentials
    writeCredentials: [
      'askisDefault',
      'askPublicKey',
      'askRune',
      'askSavedNodeName',
      'askSocket',
      async ({ askisDefault, askPublicKey, askRune, askSavedNodeName, askSocket }) => {
        return await putLnSocketCredentials({
          logger,
          is_default: askisDefault,
          public_key: askPublicKey,
          rune: askRune,
          saved_node: askSavedNodeName,
          socket: askSocket,
        });
      },
    ],
  });
};

export default askLnSocketCredentials;
