import LNSocket from 'lnsocket';
import getLnSocketCredentials from './get_ln_socket_credentials.js';

/** Get Authenticated Lightning Object
  {
  node: <Saved Node String>
  }
 
  @Returns via Promise 
  {
  lightning:{
    destory: <Destroy Connection Function Function>
    ln: <Authenticated Lightning Function Object>
    rune: <Commando Rune String>
  }
  }
 */

const authenticatedLn = async ({ node }) => {
  const credentials = await getLnSocketCredentials({ node });

  if (!credentials) {
    throw new Error('ExpectedValidCredentialsToGetAuthenticatedLn');
  }

  if (!credentials.public_key) {
    throw new Error('ExpectedValidCredentialsToGetAuthenticatedLn');
  }

  if (!credentials.rune) {
    throw new Error('ExpectedValidCommandoRuneToGetAuthenticatedLn');
  }

  if (!credentials.socket) {
    throw new Error('ExpectedValidSocketToGetAuthenticatedLn');
  }

  const lightning = await LNSocket();

  lightning.genkey();

  await lightning.connect_and_init(credentials.public_key, credentials.socket);

  const rune = credentials.rune;

  const destroy = () => lightning.destroy();

  return {
    ln: {
      destroy,
      rune,
      api: lightning,
    },
  };
};

export default authenticatedLn;
