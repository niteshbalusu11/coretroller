import { auto } from 'async';
import { existsSync } from 'fs';
import putSavedCredentials from './put_saved_credentials.js';

const defaultSavedNodeName = 'coreln';

/** Ask for paths to save credentials
 *
 * @param {
 * ask: <InquirerAskFunction>
 * logger: <WinstonLoggerObject>
 * }
 */

const askPaths = async ({ ask, logger }) => {
  return (
    await auto({
      // Check arguments
      validate: cbk => {
        if (!ask) {
          return cbk([400, 'ExpectedAskFunctionForAskingPaths']);
        }

        if (!logger) {
          return cbk([400, 'ExpectedWinstonLoggerObjectForAskingPaths']);
        }

        return cbk();
      },

      // Ask ca.pem path
      askCaPemPath: [
        'validate',
        ({}, cbk) => {
          return ask(
            {
              message: 'Enter Path to ca.pem file',
              name: 'path',
              type: 'input',
              validate: input => {
                if (!input) {
                  return false;
                }

                if (!existsSync(input)) {
                  return 'Expected valid path to ca.pem file';
                }

                return true;
              },
            },
            ({ path }) => {
              if (!path) {
                return cbk([400, 'ExpectedCaPemPathToSaveCredentials']);
              }

              return cbk(null, path);
            }
          );
        },
      ],

      // Ask client.pem path
      askClientPemPath: [
        'askCaPemPath',
        ({}, cbk) => {
          return ask(
            {
              message: 'Enter Path to client.pem file',
              name: 'path',
              type: 'input',
              validate: input => {
                if (!input) {
                  return false;
                }

                if (!existsSync(input)) {
                  return 'Expected valid path to client.pem file';
                }

                return true;
              },
            },
            ({ path }) => {
              if (!path) {
                return cbk([400, 'ExpectedClientPemPathToSaveCredentials']);
              }

              return cbk(null, path);
            }
          );
        },
      ],

      // Ask client-key.pem path
      askClientKeyPemPath: [
        'askClientPemPath',
        ({}, cbk) => {
          return ask(
            {
              message: 'Enter Path to client-key.pem file',
              name: 'path',
              type: 'input',
              validate: input => {
                if (!input) {
                  return false;
                }

                if (!existsSync(input)) {
                  return 'Expected valid path to client-key.pem file';
                }

                return true;
              },
            },
            ({ path }) => {
              if (!path) {
                return cbk([400, 'ExpectedClientKeyPemPathToSaveCredentials']);
              }

              return cbk(null, path);
            }
          );
        },
      ],

      // Ask the host:port
      askSocket: [
        'askClientKeyPemPath',
        ({}, cbk) => {
          return ask(
            {
              message: 'Enter grpc socket (host:port)',
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
                return cbk([400, 'ExpectedSocketToSaveCredentials']);
              }

              return cbk(null, socket);
            }
          );
        },
      ],

      // Ask saved node name
      askSavedNodeName: [
        'askSocket',
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
                return cbk([400, 'ExpectedSavedNodeNameToSaveCredentials']);
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
        'askCaPemPath',
        'askClientKeyPemPath',
        'askClientPemPath',
        'askisDefault',
        'askSavedNodeName',
        'askSocket',
        async ({ askCaPemPath, askClientKeyPemPath, askClientPemPath, askisDefault, askSavedNodeName, askSocket }) => {
          return await putSavedCredentials({
            logger,
            ca_cert_path: askCaPemPath,
            client_cert_path: askClientPemPath,
            client_key_path: askClientKeyPemPath,
            is_default: askisDefault,
            saved_node: askSavedNodeName,
            socket: askSocket,
          });
        },
      ],
    })
  ).writeCredentials;
};

export default askPaths;
