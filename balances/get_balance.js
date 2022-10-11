import { auto } from 'async';

const confirmedStatus = 'CONFIRMED';
const mtokensAsTokens = n => Math.floor(n / 1000);
const none = 0;
const normalStatus = 'channeldnormal';
const sumOf = (m, n) => m + n;

/** Get offchain and onchain balances
 
  {
    lightning: <Authenticated CL API Object>
    [is_detailed]: <Is Detailed Balance Bool>
    [is_offchain_only]: <Is Offchain Balance Bool>
    [is_onchain_only]: <Is Onchain Only Bool>
  }

  @Returns via Promise 
  {
    [balance]: <Total Balance Number>
    [offchain_balance]: <Offchain Balance Number>
    [onchain_balance]: <Onchan Balance Number>
  }
 */

const getBalance = async args => {
  return (
    await auto({
      // Check arguments
      validate: cbk => {
        if (!args.lightning) {
          return cbk([400, 'ExpectedAuthenticatedCoreLightningObjectToGetBalance']);
        }

        return cbk();
      },

      // List outputs and channels
      listFunds: [
        'validate',
        ({}, cbk) => {
          args.lightning.listFunds({}, (err, res) => {
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, res);
          });
        },
      ],

      // Calculate onchain balance
      onChainBalance: [
        'listFunds',
        ({ listFunds }, cbk) => {
          if (!listFunds.outputs.length || !!args.is_offchain_only) {
            return cbk(null, none);
          }

          if (!!args.is_confirmed) {
            const balance = listFunds.outputs
              .filter(n => n.status === confirmedStatus)
              .map(n => Number(n.amount_msat.msat))
              .reduce((sum, n) => sum + n, 0);

            return cbk(null, mtokensAsTokens(balance));
          }

          const balance = listFunds.outputs.map(n => Number(n.amount_msat.msat)).reduce((sum, n) => sum + n, 0);

          return cbk(null, mtokensAsTokens(balance));
        },
      ],

      // Calculate offchain balance
      offChainBalance: [
        'listFunds',
        ({ listFunds }, cbk) => {
          if (!listFunds.channels.length || !!args.is_onchain_only) {
            return cbk(null, none);
          }

          if (!!args.is_confirmed) {
            const balance = listFunds.channels
              .filter(n => n.state.toLowerCase() === normalStatus)
              .map(n => Number(n.our_amount_msat.msat))
              .reduce((sum, n) => sum + n, 0);

            return cbk(null, mtokensAsTokens(balance));
          }

          const balance = listFunds.channels.map(n => Number(n.our_amount_msat.msat)).reduce((sum, n) => sum + n, 0);

          return cbk(null, mtokensAsTokens(balance));
        },
      ],

      // Return balances
      balance: [
        'offChainBalance',
        'onChainBalance',
        ({ offChainBalance, onChainBalance }, cbk) => {
          if (!!args.is_onchain_only) {
            return cbk(null, {
              balance: onChainBalance,
            });
          }

          if (!!args.is_offchain_only) {
            return cbk(null, {
              balance: offChainBalance,
            });
          }

          if (!!args.is_detailed) {
            return cbk(null, {
              offchain_balance: offChainBalance,
              onchain_balance: onChainBalance,
            });
          }

          return cbk(null, {
            balance: sumOf(offChainBalance, onChainBalance),
          });
        },
      ],
    })
  ).balance;
};

export default getBalance;
