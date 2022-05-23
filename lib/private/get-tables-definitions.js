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
      outputFriendlyName: 'Get tables properties'
    },
    invalid: {
      outputFriendlyName: 'Has probably error in connection'
    },
    queryFailed: {
      outputFriendlyName: 'Has probably error in connection'
    },
  },
  fn: async function getTablesProperties({connection}, exits) {
    try {
      const psGetType = new mssql.PreparedStatement(connection);
      const preparedStatement = await psGetType.prepare(`
        SELECT DATA_TYPE,
               TABLE_NAME,
               COLUMN_NAME,
               NUMERIC_PRECISION,
               NUMERIC_SCALE,
               DATETIME_PRECISION,
               CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS`)
        .catch(err => {
          return exits.queryFailed(err);
        });
      const results = await preparedStatement.execute().catch(async err => {
        await psGetType.unprepare().catch(err => {
          return exits.queryFailed(err);
        });
        return exits.queryFailed(err);
      });
      await psGetType.unprepare().catch(err => {
        return exits.queryFailed(err);
      });
      return exits.success(results.recordsets);
    } catch (e) {
      return exits.invalid(e);
    }
  }
});
