import { auto } from 'async';
const home = '.clbos';

const getCa = async ({ node }) => {
  return await auto({
    validate: () => {
      return;
    },
  });
};

export default getCa;
