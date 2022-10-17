import { interactions } from '../constants.js';

/** Handle start command
  Syntax of command:
  /start
  {
    from: <Message From User Id Number>
    [id]: <Connected User Id Number>
    reply: <Reply Function>
  }
*/
const handleStartCommand = ({ id, reply }) => {
  // Exit early when the bot is already connected
  if (!!id) {
    return reply(interactions.bot_is_connected);
  }

  return reply(interactions.start_message);
};

export default handleStartCommand;
