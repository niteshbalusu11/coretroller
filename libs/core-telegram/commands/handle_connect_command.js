import { interactions } from '../constants.js';

/** Handle connect command
  Syntax of command:
  /connect
  {
    from: <Message From User Id Number>
    [id]: <Connected User Id Number>
    reply: <Reply Function>
  }
*/
const handleConnectCommand = ({ from, id, reply }) => {
  if (!!id) {
    return reply(interactions.bot_is_connected);
  }

  return reply(`🤖 Connection code is: \`${from}\``);
};

export default handleConnectCommand;
