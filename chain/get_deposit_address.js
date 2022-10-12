import { auto } from 'async';
import { newAddr } from '../core-lightning/methods.js';
import qrcode from 'qrcode-terminal';
const bigTok = tokens => (!tokens ? '0' : (tokens / 1e8).toFixed(8));

/** Get deposit address

  {
    [format]: <Address Format String>
    lightning: <Authenticated CL API Object>
    [tokens]: <Tokens to Receive Number>
  }

  @returns via Promise
  {
    deposit_address: <Deposit Address String>
    deposit_qr: <Deposit Address URL QR Code String>
  }
*/
const getDepositAddress = async args => {
  return (
    await auto({
      // Check arguments
      validate: cbk => {
        if (!args.ln) {
          return cbk([400, 'ExpectedAuthenticatedCoreLightningObjectToCreateNewAddress']);
        }

        return cbk();
      },

      // Address type
      addresstype: [
        'validate',
        ({}, cbk) => {
          if (args.format === 'p2wpkh') {
            return cbk(null, 'bech32');
          }

          if (args.format === 'np2wpkh') {
            return cbk(null, 'p2sh-segwit');
          }

          return cbk(null, 'bech32');
        },
      ],

      // Create new address
      newAddress: [
        'validate',
        async ({ addresstype }) => {
          return await newAddr({ ln: args.ln, params: { addresstype } });
        },
      ],

      qr: [
        'newAddress',
        ({ newAddress }, cbk) => {
          const url = `bitcoin:${newAddress.bech32 || newAddress['p2sh-segwit']}?amount=${bigTok(args.tokens)}`;

          return qrcode.generate(url, { small: true }, code => cbk(null, code));
        },
      ],

      // Address details and QR
      address: [
        'newAddress',
        'qr',
        ({ newAddress, qr }, cbk) => {
          return cbk(null, {
            deposit_address: newAddress.bech32 || newAddress['p2sh-segwit'],
            deposit_qr: qr,
          });
        },
      ],
    })
  ).address;
};

export default getDepositAddress;
