import { auto } from 'async';
import { homePath } from '../storage/index.js';
import { join } from 'path';
import { readFile } from 'fs';

const configFile = 'config.json';
const credentialsFile = 'credentials.json';
const { parse } = JSON;

/** Get saved credentials from disk
 
  {
    node: <Saved Node String>
  }
 
  @Returns via Promise 
  {
    ca_cert: <CA Cert File Buffer>
    client_cert: <Client Cert File Buffer>
    client_key: <Client Key File Buffer>
    socket: <Socket String>
  }
 */

const getLnSocketCredentials = async ({ node }) =>
  (
    await auto({
      forNode: cbk => {
        if (!!node) {
          return cbk(null, node);
        }

        const path = join(...[homePath({}).path, configFile]);

        return readFile(path, (err, res) => {
          // Exit early on errors, there is no config found
          if (!!err || !res) {
            return cbk([400, 'ExpectedConfigFileToGetLnSocketCredentialsFrom', err]);
          }

          try {
            parse(res.toString());
          } catch (err) {
            return cbk([400, 'ExpectedValidConfigFileToGetLnSocketCredentials', err]);
          }

          const config = parse(res.toString());

          if (!config.default_saved_node) {
            return cbk([400, 'ExpectedDefaultNodeOrSpecifiedNodeToGetLnSocketCredentials']);
          }

          return cbk(null, config.default_saved_node);
        });
      },

      getCredentialsFile: [
        'forNode',
        ({ forNode }, cbk) => {
          const path = join(...[homePath({}).path, forNode, credentialsFile]);

          return readFile(path, (err, res) => {
            // Exit early on errors, there is no config found
            if (!!err || !res) {
              return cbk([400, 'ExpectedCredentialsFileToGetLnSocketCredentialsFrom', err]);
            }

            try {
              parse(res.toString());
            } catch (err) {
              return cbk([400, 'ExpectedValidCredentialsFileToGetLnSocketCredentials', err]);
            }

            const credentials = parse(res.toString());

            return cbk(null, credentials);
          });
        },
      ],

      credentials: [
        'getCredentialsFile',
        ({ getCredentialsFile }, cbk) => {
          if (!getCredentialsFile.public_key) {
            return cbk([400, 'ExpectedPublicKeyInCredentialsFileToGetLnSocketCredentials']);
          }

          if (!getCredentialsFile.rune) {
            return cbk([400, 'ExpectedCommandoRuneInCredentialsFileToGetLnSocketCredentials']);
          }

          if (!getCredentialsFile.socket) {
            return cbk([400, 'ExpectedSocketInCredentialsFileToGetLnSocketCredentials']);
          }

          return cbk(null, {
            public_key: getCredentialsFile.public_key,
            rune: getCredentialsFile.rune,
            socket: getCredentialsFile.socket,
          });
        },
      ],
    })
  ).credentials;

export default getLnSocketCredentials;
