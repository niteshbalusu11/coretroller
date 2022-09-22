import { existsSync, mkdir, writeFile } from 'fs';

import authenticatedCoreLightning from './authenticated_core_lightning.js';
import { auto } from 'async';
import { homePath } from '../storage/index.js';
import { join } from 'path';

const configFile = 'config.json';
const credentialsFile = 'credentials.json';
const stringify = obj => JSON.stringify(obj, null, 2);

/** Writes credentials paths to disk
 *
 * @param {
 * ca_cert_path: <Path to CA Cert File String>
 * client_cert_path: <Path to Client Cert File String>
 * client_key_path: <Path to Client Key File String>
 * logger: <WinstonLoggerObject>
 * socket: <gRPC Socket String>
 * saved_node: <Saved Node String>
 * }
 *
 * @returns
 */

const putSavedCredentials = async args => {
  return (
    await auto({
      // Check arguments
      validate: cbk => {
        if (!args.ca_cert_path || !existsSync(args.ca_cert_path)) {
          return cbk(['400', 'ExpectedValidCaPathForSavingCredentials']);
        }

        if (!args.client_cert_path || !existsSync(args.client_cert_path)) {
          return cbk(['400', 'ExpectedValidClientCertPathForSavingCredentials']);
        }

        if (!args.client_key_path || !existsSync(args.client_key_path)) {
          return cbk(['400', 'ExpectedValidClientKeyPathForSavingCredentials']);
        }

        if (!args.logger) {
          return cbk([400, 'ExpectedWinstonLoggerObjectForSavingCredentials']);
        }

        if (!args.socket) {
          return cbk([400, 'ExpectedSocketForSavingCredentials']);
        }

        if (!args.saved_node) {
          return cbk(['400', 'ExpectedSavedNodeNameForSavingCredentials']);
        }

        return cbk();
      },

      // Create the home directory
      makeHomeDir: [
        'validate',
        ({}, cbk) => {
          const { path } = homePath({});

          mkdir(path, err => {
            // Ignore errors, the directory may already exist
            if (!!err) {
              return cbk();
            }

            return cbk();
          });
        },
      ],

      // Create the saved node directory
      makeSavedNodeDir: [
        'makeHomeDir',
        ({}, cbk) => {
          const { path } = homePath({ file: args.saved_node });

          mkdir(path, err => {
            // Ignore errors, the directory may already exist
            if (!!err) {
              return cbk();
            }

            return cbk();
          });
        },
      ],

      // Write the config.json file
      writeConfigFile: [
        'makeSavedNodeDir',
        ({}, cbk) => {
          if (!args.is_default) {
            return cbk();
          }

          const path = join(...[homePath({}).path, configFile]);

          const data = stringify({
            default_saved_node: args.saved_node,
          });

          writeFile(path, data, err => {
            if (!!err) {
              return cbk([400, 'UnexpectedErrorWritingConfigFile', err]);
            }

            return cbk();
          });
        },
      ],

      // Write the credentials.json file
      writeCredentialFile: [
        'makeSavedNodeDir',
        ({}, cbk) => {
          const path = join(...[homePath({ file: args.saved_node }).path, credentialsFile]);

          const data = stringify({
            ca_cert_path: args.ca_cert_path,
            client_key_path: args.client_key_path,
            client_cert_path: args.client_cert_path,
            socket: args.socket,
          });

          writeFile(path, data, err => {
            if (!!err) {
              return cbk([400, 'UnexpectedErrorWritingCredentialsFile', { err }]);
            }

            return cbk();
          });
        },
      ],

      // Validate the saved credentials
      validateCredentials: [
        'writeCredentialFile',
        async () => {
          const { lightning } = await authenticatedCoreLightning({
            node: !args.is_default ? args.saved_node : undefined,
          });

          lightning.Getinfo({}, (err, info) => {
            if (!!err || !info) {
              throw new Error('400, UnexpectedErrorConnectingToCoreLightning', err);
            }

            args.logger.info({
              is_authenticated: true,
            });
          });

          return;
        },
      ],
    })
  ).writeCredentialPath;
};

export default putSavedCredentials;
