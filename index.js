import LNSocket from 'lnsocket';

async function go() {
  const ln = await LNSocket();

  ln.genkey();

  await ln.connect_and_init('02a22dd50a666fda5cc7cb220ecab086cb32829b67d92aafde251dd76c99c332f8', 'localhost:9835');

  const rune = 'NqVrsCGrCX1G9eD8mL8_ZCKl2QOgffP740Z-SZyGXdA9MA==';

  const { result } = await ln.rpc({ method: 'getinfo', rune });

  console.log(result);

  // ln.destroy();

  return result;
}

go();
