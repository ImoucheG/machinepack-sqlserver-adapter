const mssql = require('mssql');
module.exports = require('machine').build({
  friendlyName: 'Get columns properties',
  sideEffects: 'cacheable',
  inputs: {
    tableName: {
      type: 'string',
      required: true
    },
    connection: {
      type: 'ref',
      required: true
    }
  },
  exits: {
    success: {
      outputFriendlyName: 'Get columns properties'
    },
    invalid: {
      outputFriendlyName: 'Has probably error in connection'
    },
    queryFailed: {
      outputFriendlyName: 'Has probably error in connection'
    },
  },
  fn: async function getColumnsProperties(inputs, exits) {
    try {
      const psGetType = new mssql.PreparedStatement(inputs.connection);
      if (inputs.tableName.includes(' ')) {
        inputs.tableName = inputs.tableName.split(' ')[0];
      }
      const preparedStatement = await psGetType.prepare(`SELECT DATA_TYPE,
                                                                COLUMN_NAME,
                                                                NUMERIC_PRECISION,
                                                                NUMERIC_SCALE,
                                                                DATETIME_PRECISION,
                                                                CHARACTER_MAXIMUM_LENGTH
                                                         FROM INFORMATION_SCHEMA.COLUMNS
                                                         WHERE TABLE_NAME = '${inputs.tableName}'`)
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
      return exits.success(results.recordsets[0]);
    } catch (e) {
      return exits.invalid(e);
    }
  }
});
