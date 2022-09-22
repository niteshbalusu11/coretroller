import { auto } from 'async';
import { homePath } from '../storage/index.js';
import { join } from 'path';
import { readFile } from 'fs';

const configFile = 'config.json';
const credentialsFile = 'credentials.json';
const { parse } = JSON;

const getSavedCredentials = async ({ node }) => {
  return (
    await auto({
      forNode: cbk => {
        if (!!node) {
          return cbk(null, node);
        }

        const path = join(...[homePath({}).path, configFile]);

        return readFile(path, (err, res) => {
          // Exit early on errors, there is no config found
          if (!!err || !res) {
            return cbk([400, 'ExpectedConfigFileToGetCredentialsFrom', err]);
          }

          try {
            console.log(res.toString());
            parse(res.toString());
          } catch (err) {
            return cbk([400, 'ExpectedValidConfigFileToGetCredentials', err]);
          }

          const config = parse(res.toString());

          if (!config.default_saved_node) {
            return cbk([400, 'ExpectedDefaultNodeOrSpecifiedNodeToGetCredentials']);
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
              return cbk([400, 'ExpectedCredentialsFileToGetCredentialsFrom', err]);
            }

            try {
              parse(res.toString());
            } catch (err) {
              return cbk([400, 'ExpectedValidCredentialsFileToGetCredentials', err]);
            }

            const credentials = parse(res.toString());

            return cbk(null, credentials);
          });
        },
      ],

      readCaCertFile: [
        'getCredentialsFile',
        ({ getCredentialsFile }, cbk) => {
          readFile(getCredentialsFile.ca_cert_path, (err, res) => {
            if (!!err || !res) {
              return cbk([400, 'UnexpectedErrorReadingCaCertFile', err]);
            }

            return cbk(null, res);
          });
        },
      ],

      readClientCertFile: [
        'getCredentialsFile',
        ({ getCredentialsFile }, cbk) => {
          readFile(getCredentialsFile.client_cert_path, (err, res) => {
            if (!!err || !res) {
              return cbk([400, 'UnexpectedErrorReadingClientCertFile', err]);
            }

            return cbk(null, res);
          });
        },
      ],

      readClientKeyFile: [
        'getCredentialsFile',
        ({ getCredentialsFile }, cbk) => {
          readFile(getCredentialsFile.client_key_path, (err, res) => {
            if (!!err || !res) {
              return cbk([400, 'UnexpectedErrorReadingClientKeyFile', err]);
            }

            return cbk(null, res);
          });
        },
      ],

      credentials: [
        'getCredentialsFile',
        'readCaCertFile',
        'readClientCertFile',
        'readClientKeyFile',
        ({ readCaCertFile, readClientCertFile, readClientKeyFile, getCredentialsFile }, cbk) => {
          if (!getCredentialsFile.socket) {
            return cbk([400, 'ExpectedSocketInCredentialsFileToGetSavedCredentials']);
          }

          return cbk(null, {
            ca_cert: readCaCertFile,
            client_cert: readClientCertFile,
            client_key: readClientKeyFile,
            socket: getCredentialsFile.socket,
          });
        },
      ],
    })
  ).credentials;
};

export default getSavedCredentials;
