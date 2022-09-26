import { auto } from 'async';
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
        if (!args.lightning) {
          return cbk([400, 'ExpectedAuthenticatedCoreLightningObjectToCreateNewAddress']);
        }

        return cbk();
      },

      // Address type
      addresstype: [
        'validate',
        ({}, cbk) => {
          if (args.format === 'p2wpkh') {
            return cbk(null, 0);
          }

          if (args.format === 'np2wpkh') {
            return cbk(null, 1);
          }

          return cbk(null, 0);
        },
      ],

      // Create new address
      newAddress: [
        'validate',
        ({ addresstype }, cbk) => {
          return args.lightning.NewAddr({ addresstype }, cbk);
        },
      ],

      qr: [
        'newAddress',
        ({ newAddress }, cbk) => {
          const url = `bitcoin:${newAddress.bech32 || newAddress.p2sh_segwit}?amount=${bigTok(args.tokens)}`;
          console.log(url);
          return qrcode.generate(url, { small: true }, code => cbk(null, code));
        },
      ],

      // Address details and QR
      address: [
        'newAddress',
        'qr',
        ({ newAddress, qr }, cbk) => {
          return cbk(null, {
            deposit_address: newAddress.bech32 || newAddress.p2sh_segwit,
            deposit_qr: qr,
          });
        },
      ],
    })
  ).address;
};

export default getDepositAddress;
