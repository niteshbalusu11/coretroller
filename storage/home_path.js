import { homedir } from 'os';
import { join } from 'path';

const home = join(...[homedir(), '.ctrl']);

/** Writes credentials paths to disk
  {
    file: <File Name String>
  }
 
  @Returns via Promise
  {
    path: <Joined Path String>
  }
 */

const homePath = ({ file }) => {
  const dir = home;

  return { path: join(...[dir, file].filter(n => !!n)) };
};

export default homePath;
