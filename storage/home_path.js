import { homedir } from 'os';
import { join } from 'path';

const home = join(...[homedir(), '.corebos']);

/** Get the path of the bos storage directory

  {
    file: <File Name String>
  }

  @returns
  {
    path: <Home Directory Path String>
  }
*/
const homePath = ({ file }) => {
  const dir = home;

  return { path: join(...[dir, file].filter(n => !!n)) };
};

export default homePath;
