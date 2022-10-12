import { mkdir, writeFile } from 'fs';

import authenticatedLn from './authenticated_ln.js';
import { auto } from 'async';
import { getInfo } from './methods.js';
import { homePath } from '../storage/index.js';
import { join } from 'path';

const configFile = 'config.json';
const credentialsFile = 'credentials.json';
const stringify = obj => JSON.stringify(obj, null, 2);

/** Writes credentials paths to disk
  {
  logger: <WinstonLoggerObject>
  public_key: <Public Key String>
  rune: <Commando Rune String>
  saved_node: <Saved Node String>
  socket: <gRPC Socket String>
  }

  @Returns via Promise
 */

const putLnSocketCredentials = async args => {
  return (
    await auto({
      // Check arguments
      validate: cbk => {
        if (!args.logger) {
          return cbk([400, 'ExpectedWinstonLoggerObjectForSavingLnSocketCredentials']);
        }

        if (!args.public_key) {
          return cbk([400, 'ExpectedPublicKeyForSavingLnSocketCredentials']);
        }

        if (!args.rune) {
          return cbk([400, 'ExpectedCommandoRuneForSavingLnSocketCredentials']);
        }

        if (!args.saved_node) {
          return cbk(['400', 'ExpectedSavedNodeNameForSavingLnSocketCredentials']);
        }

        if (!args.socket) {
          return cbk([400, 'ExpectedSocketForSavingLnSocketCredentials']);
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
            public_key: args.public_key,
            rune: args.rune,
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
          const ln = (
            await authenticatedLn({
              node: !args.is_default ? args.saved_node : undefined,
            })
          ).ln;

          const result = await getInfo({ ln, params: undefined });

          ln.destroy();

          if (!result) {
            throw new Error('500-FailedToValidateLnSocketCredentials');
          }

          return;
        },
      ],
    })
  ).writeCredentialPath;
};

export default putLnSocketCredentials;
