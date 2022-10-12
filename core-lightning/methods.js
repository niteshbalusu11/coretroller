// Get funds
export const listFunds = async ({ ln, params }) => {
  const output = await ln.api.rpc({ method: 'listfunds', params, rune: ln.rune });

  if (!!output.error) {
    ln.destroy();

    throw new Error(output.error.message);
  }

  return output.result;
};

// Generate a new address
export const newAddr = async ({ ln, params }) => {
  const output = await ln.api.rpc({ method: 'newaddr', params, rune: ln.rune });

  if (!!output.error) {
    ln.destroy();

    throw new Error(output.error.message);
  }

  return output.result;
};
