/** Get ask function

  {}

  @returns
  <Interrogation Function>
*/
const interrogate = async ({}) => {
  const inquirer = (await import('inquirer')).default;

  return (n, cbk) => inquirer.prompt([n]).then(res => cbk(res));
};

export default interrogate;
