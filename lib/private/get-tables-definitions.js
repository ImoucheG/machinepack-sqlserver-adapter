const mssql = require('mssql');
module.exports = require('machine').build({
  friendlyName: 'Get tables properties',
  sideEffects: 'cacheable',
  inputs: {
    connection: {
      type: 'ref',
      required: true
    }
  },
  exits: {
    success: {
      description: 'Create manager with success'
    }
  },
  fn: async function getTablesProperties({connection}, {success}) {
    const psGetType = new mssql.PreparedStatement(connection);
    const preparedStatement = await psGetType.prepare(`
      SELECT DATA_TYPE,
             TABLE_NAME,
             COLUMN_NAME,
             NUMERIC_PRECISION,
             NUMERIC_SCALE,
             DATETIME_PRECISION,
             CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS`);
    const results = await preparedStatement.execute().catch(async err => {
      await psGetType.unprepare();
      throw err;
    });
    psGetType.unprepare();
    return success(results.recordsets);
  }
});
