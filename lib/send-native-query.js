const debug = require('debug')('query');
const mssql = require('mssql');
module.exports = {
  friendlyName: 'Send native query',
  description: 'Send a native query to the MSSQL database.',
  inputs: {
    manager: {
      friendlyName: 'Manager',
      description: 'The connection manager instance to acquire the connection from.',
      extendedDescription:
        'Only managers built using the `createManager()` method of this driver are supported. ' +
        'Also, the database connection manager instance provided must not have been destroyed--' +
        'i.e. once `destroyManager()` is called on a manager, no more connections can be acquired ' +
        'from it (also note that all existing connections become inactive-- see `destroyManager()` ' +
        'for more on that).',
      example: '===',
    },
    statement: {
      type: 'json',
      friendlyName: 'Statement query',
      description: 'Information on the query'
    },
    connection: {
      friendlyName: 'Connection Pool',
      description: 'An active database connection.',
      extendedDescription: 'The provided database connection instance must still be active.  Only database connection instances created by the `getConnection()` machine in this driver are supported.',
      example: '===',
      required: true
    },
    nativeQuery: {
      description: 'A native query for the database.',
      extendedDescription: 'If `valuesToEscape` is provided, this supports template syntax like `$1`, `$2`, etc.',
      whereToGet: {
        description: 'Write a native query for this database, or if this driver supports it, use `compileStatement()` to build a native query from Waterline syntax.',
        extendedDescription: 'This might be compiled from a Waterline statement (stage 4 query) using "Compile statement", however it could also originate directly from userland code.'
      },
      example: 'SELECT * FROM pets WHERE species=$1 AND nickname=$2',
      required: true
    },
    valuesToEscape: {
      description: 'An optional list of strings, numbers, or special literals (true, false, or null) to escape and include in the native query, in order.',
      extendedDescription: 'The first value in the list will be used to replace `$1`, the second value to replace `$2`, and so on.  Note that numbers, `true`, `false`, and `null` are interpreted _differently_ than if they were strings wrapped in quotes.  This array must never contain any arrays or dictionaries.',
      example: '===',
      defaultsTo: []
    },
    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional stuff to pass to the driver.',
      extendedDescription: 'This is reserved for custom driver-specific extensions.  Please refer to the documentation for the driver you are using for more specific information.',
      example: '==='
    }
  },
  exits: {
    success: {
      description: 'The native query was executed successfully.',
      outputVariableName: 'report',
      outputDescription: 'The `result` property is the result data the database sent back.  The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
    },
    queryFailed: {
      description: 'The database returned an error when attempting to execute the native query.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance with more details about what went wrong.  The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
    },
    error: {
      description: 'The database returned an error when attempting to execute query.'
    },
    preparedStatement: {
      description: 'The database returned an error when attempting to prepare query.'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'The provided connection is not valid or no longer active.  Are you sure it was obtained by calling this driver\'s `getConnection()` method?',
      extendedDescription: 'Usually, this means the connection to the database was lost due to a logic error or timing issue in userland code.  In production, this can mean that the database became overwhelemed or was shut off while some business logic was in progress.',
      outputVariableName: 'report',
      outputDescription: 'The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
    }
  },
  fn: async function sendNativeQuery({manager, connection, meta, nativeQuery, valuesToEscape, statement}, exits) {
    try {
      const validateConnection = require('./private/validate-connection');
      const getParams = require('./private/get-params');

      let isOrmSendNativeQuery = false;
      if (!manager) {
        isOrmSendNativeQuery = true;
        manager = {connection: connection};
      }

      const isValidConnection = await validateConnection({connection: connection})
        .catch(err => {
          return exits.badConnection({
            meta: meta,
            error: err
          });
        });
      if (!isValidConnection) {
        return exits.badConnection({
          meta: meta
        });
      }

      let sql = nativeQuery;
      let bindings = valuesToEscape || [];
      let queryInfo;

      if (!meta || !meta.isUsingQuestionMarks) {
        sql = sql.replace(/\$[1-9][0-9]*/g, function (substr) {
          const idx = +(substr.slice(1)) - 1;
          if (idx >= bindings.length) {
            return substr;
          }
          return connection.escape(bindings[idx]);
        });
        queryInfo = {sql};
      } else {
        queryInfo = {
          sql: sql,
          values: bindings
        };
      }

      debug('Compiled (final) SQL: ' + sql);
      let ps = new mssql.PreparedStatement(connection);
      const resultParams = await getParams({
        preparedStatement: ps,
        statement: statement,
        values: valuesToEscape,
        sql: queryInfo.sql,
        tablesProperties: manager.tablesProperties
      }).catch(err => {
        return exits.queryFailed(err);
      });
      if (resultParams) {
        ps = resultParams.preparedStatement;
        const params = resultParams.params;

        const preparedStatement = await ps.prepare(queryInfo.sql).catch(err => {
          return exits.preparedStatement(err);
        });
        if (preparedStatement) {
          const result = await preparedStatement.execute(params).catch(async err => {
            preparedStatement.unprepare().catch(err => {
              return exits.preparedStatement(err);
            });
            return exits.error({error: err.originalError.message, meta: meta});
          });
          preparedStatement.unprepare().catch(err => {
            return exits.error(err);
          });

          let normalizedNativeResult = {};
          if (!isOrmSendNativeQuery && result && result.recordset) {
            normalizedNativeResult.rows = result.recordset;
            normalizedNativeResult.fields = result.recordsets;
          } else {
            if (result && result.recordsets) {
              if (result.recordsets.length === 1 || (result.recordsets.length === 2 && result.recordsets[1].length === 0)) {
                normalizedNativeResult = result.recordsets[0];
              } else {
                normalizedNativeResult = result.recordsets;
              }
            }
          }
          return exits.success({
            result: normalizedNativeResult,
            meta: meta
          });
        }
      }
    } catch (err) {
      return exits.error(err);
    }
  }
};
