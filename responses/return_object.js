// const { getBorderCharacters } = require('table');

import { table as renderTable } from 'table';

// const renderTable = require('table').table;
// import renderTable from 'table';

// const border = getBorderCharacters('norc');
const emptyCell = ' ';
const { isArray } = Array;
const summary = n => `${n}_summary`;

/** Return an object result to a logger in a promise

  A write method is required if file is passed

  {
    logger: {
      info: <Info Function>
    }
    [table]: <Show as Table From Result Attribute String>
  }

  @returns
  <Standard Callback Function> (err, res) => {}
*/
const returnObject = ({ logger, table, result }) => {
  // Exit early when logging a result
  if (!!result) {
    logger.info(result);
  }

  // Exit early when the table is empty
  if (!!table && table.length === [table].length) {
    const [header] = table;

    logger.info(renderTable([header, header.map(() => emptyCell)]));

    return;
  }

  // Exit early when a table output is requested
  if (!!table) {
    logger.info(renderTable(table));

    if (isArray(summary(table))) {
      logger.info(renderTable(summary(table)));
    }

    return;
  }

  return;
};

export default returnObject;
