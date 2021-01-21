// Dependencies
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
      friendlyName: 'Connection',
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
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'The provided connection is not valid or no longer active.  Are you sure it was obtained by calling this driver\'s `getConnection()` method?',
      extendedDescription: 'Usually, this means the connection to the database was lost due to a logic error or timing issue in userland code.  In production, this can mean that the database became overwhelemed or was shut off while some business logic was in progress.',
      outputVariableName: 'report',
      outputDescription: 'The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
    }
  },
  fn: async function sendNativeQuery(inputs, exits) {
    let validateConnection = require('./private/validate-connection');
    let isOrmSendNativeQuery = false;
    if (!inputs.manager) {
      isOrmSendNativeQuery = true;
      inputs.manager = {pool: inputs.connection.parentPool};
    }
    // Validate provided connection.
    const isValidConnection = await validateConnection({connection: inputs.connection, manager: inputs.manager}).catch(err => {
      return exits.badConnection({
        meta: inputs.meta,
        error: err
      });
    });
    if (!isValidConnection) {
      return exits.badConnection({
        meta: inputs.meta
      });
    }
    // Validate provided native query.
    let sql = inputs.nativeQuery;
    let bindings = inputs.valuesToEscape || [];
    let queryInfo;
    debug('Running SQL Query:');
    debug('SQL: ' + sql);
    debug('Bindings: ' + bindings);
    debug('Connection Id: ' + inputs.connection.id);
    // If the meta flag is defined and it has a flag titled `isUsingQuestionMarks`
    // then the query was generated by Knex in compileStatement and the query
    // string is using `?` in place of values rather than the Waterline standardized
    // $1, $2, etc.
    if (!inputs.meta || !inputs.meta.isUsingQuestionMarks) {
      // Process SQL template, escaping bindings.
      // This converts `$1`, `$2`, etc. into the escaped binding.
      sql = sql.replace(/\$[1-9][0-9]*/g, function (substr) {
        // e.g. `'$3'` => `'3'` => `3` => `2`
        let idx = +(substr.slice(1)) - 1;
        // If no such binding exists, then just leave the original
        // template string (e.g. "$3") alone.
        if (idx >= bindings.length) {
          return substr;
        }
        // But otherwise, replace it with the escaped binding.
        return inputs.connection.escape(bindings[idx]);
      });
      // In this case the query has the values inline.
      queryInfo = {sql};
    } else {
      queryInfo = {
        sql: sql,
        values: bindings
      };
    }
    debug('Compiled (final) SQL: ' + sql);
    // Prepare the preparedStatement
    const ps = new mssql.PreparedStatement(inputs.manager.pool);
    // Add input
    // Only int is specified else the others values has varchar by default
    // param increase with step 1 and start at 0
    const params = {};
    if (queryInfo.values && queryInfo.values.length > 0) {
      let i = 0;
      if (inputs.statement && inputs.statement.columns && inputs.statement.tableName) {
        for (let column of inputs.statement.columns) {
          column = column.split('.');
          column = column[column.length - 1];
          if (queryInfo.sql.includes('top (@p' + i.toString() + ')') || queryInfo.sql.includes('@p' + i.toString() + ' rows')) {
            ps.input('p' + i.toString(), mssql.BigInt());
            params['p' + i.toString()] = queryInfo.values[i];
            i++;
          }
          if (queryInfo.values.length >= i && queryInfo.sql.includes('@p' + i.toString())) {
            let type;
            const psGetType = new mssql.PreparedStatement(inputs.manager.pool);
            let tableName = inputs.statement.tableName;
            // With one-to-many deleted the alias 'as ....'
            if (tableName.includes(' ')) {
              tableName = tableName.split(' ')[0];
            }
            const preparedStatement = await psGetType.prepare(`SELECT DATA_TYPE,
                                                                      NUMERIC_PRECISION,
                                                                      NUMERIC_SCALE,
                                                                      DATETIME_PRECISION,
                                                                      CHARACTER_MAXIMUM_LENGTH
                                                               FROM INFORMATION_SCHEMA.COLUMNS
                                                               WHERE TABLE_NAME = '` + tableName + `' AND
                   COLUMN_NAME = '` + column + `'`);
            const results = await preparedStatement.execute();
            await psGetType.unprepare();
            const columnProperty = results.recordsets[0][0];
            let numberCharactersSpecials = 0;
            if (queryInfo.values[i] && typeof queryInfo.values[i] === 'string') {
              const match = queryInfo.values[i].match(/%/g) || [];
              if (match) {
                numberCharactersSpecials = match.length;
              }
            }
            if (columnProperty.CHARACTER_MAXIMUM_LENGTH && queryInfo.values[i] && columnProperty.DATA_TYPE !== 'xml') {
              if (queryInfo.values[i].length > (columnProperty.CHARACTER_MAXIMUM_LENGTH + numberCharactersSpecials)) {
                return exits.queryFailed({
                  error: {
                    message: 'Column ' + column + ' is too many large with this value ' + queryInfo.values[i] +
                      ', the length authorized is ' + (columnProperty.CHARACTER_MAXIMUM_LENGTH + numberCharactersSpecials)
                  }
                });
              }
            }
            switch (columnProperty.DATA_TYPE.toLowerCase()) {
              case 'decimal':
                type = mssql.Decimal(columnProperty.NUMERIC_PRECISION, columnProperty.NUMERIC_SCALE);
                break;
              case 'varchar':
                type = mssql.VarChar(columnProperty.CHARACTER_MAXIMUM_LENGTH + numberCharactersSpecials);
                break;
              case 'numeric':
                type = mssql.Numeric(columnProperty.NUMERIC_PRECISION, columnProperty.NUMERIC_SCALE);
                break;
              case 'bigint':
                type = mssql.BigInt();
                break;
              case 'binary':
                type = mssql.Binary(columnProperty.CHARACTER_MAXIMUM_LENGTH);
                break;
              case 'bit':
                type = mssql.Bit();
                break;
              case 'char':
                type = mssql.Char(columnProperty.CHARACTER_MAXIMUM_LENGTH);
                break;
              case 'date':
                type = mssql.Date();
                break;
              case 'datetime':
                type = mssql.DateTime();
                break;
              case 'float':
                type = mssql.Float();
                break;
              case 'geography':
                type = mssql.Geography();
                break;
              case 'geometry':
                type = mssql.Geometry();
                break;
              case 'image':
                type = mssql.Image();
                break;
              case 'int':
                type = mssql.Int();
                break;
              case 'money':
                type = mssql.Money();
                break;
              case 'nchar':
                type = mssql.NChar(columnProperty.CHARACTER_MAXIMUM_LENGTH);
                break;
              case 'ntext':
                type = mssql.NText();
                break;
              case 'nvarchar':
                type = mssql.NVarChar(columnProperty.CHARACTER_MAXIMUM_LENGTH);
                break;
              case 'real':
                type = mssql.Real();
                break;
              case 'text':
                type = mssql.Text();
                break;
              case 'timestamp':
                type = mssql.Time(mssql.MAX);
                break;
              case 'uniqueidentifier':
                type = mssql.UniqueIdentifier();
                break;
              case 'varbinary':
                type = mssql.VarBinary(columnProperty.CHARACTER_MAXIMUM_LENGTH);
                break;
              case 'xml':
                if (queryInfo.values[i].includes('<?xml')) {
                  queryInfo.values[i] = queryInfo.values[i].substr(queryInfo.values[i].indexOf('?>') + 2,
                  queryInfo.values[i].length);
                }
                type = mssql.Xml();
                break;
              default:
                type = mssql.VarChar(columnProperty.CHARACTER_MAXIMUM_LENGTH);
                break;
            }
            if (Buffer.isBuffer(queryInfo.values[i])) {
              type = mssql.VarBinary(mssql.MAX);
            }
            ps.input('p' + i.toString(), type);
            params['p' + i.toString()] = queryInfo.values[i];
            i++;
          }
        }
      }
      if (queryInfo.values.length > inputs.statement.columns.length) {
        i = inputs.statement.columns.length;
        while (i < queryInfo.values.length) {
          if (queryInfo.sql.includes('top (@p' + i.toString() + ')') || queryInfo.sql.includes('@p' + i.toString() + ' rows')) {
            ps.input('p' + i.toString(), mssql.BigInt());
            params['p' + i.toString()] = queryInfo.values[i];
          }
          i++;
        }
      }
    }
    const preparedStatement = await ps.prepare(queryInfo.sql).catch(err => {
      return exits.queryFailed({
        error: err,
        meta: inputs.meta
      });
    });
    const result = await preparedStatement.execute(params).catch(err => {
      return exits.queryFailed({
        error: err,
        meta: inputs.meta
      });
    });
    await ps.unprepare().catch(err => {
      return exits.queryFailed(err);
    });
    // If the first argument is truthy, then treat it as an error.
    // (i.e. close shop early &gtfo; via the `queryFailed` exit)
    // Otherwise, the query was successful.
    // Since the arguments passed to this callback and their data format
    // can vary across different types of queries, we do our best to normalize
    // that here.  However, in order to do so, we have to be somewhat
    // opinionated; i.e. using the following heuristics when building the
    // standard `result` dictionary:
    //  • If the 2nd arg is an array, we expose it as `result.rows`.
    //  • Otherwise if the 2nd arg is a dictionary, we expose it as `result`.
    //  • If the 3rd arg is an array, we include it as `result.fields`.
    //    (if the 3rd arg is an array AND the 2nd arg is a dictionary, then
    //     the 3rd arg is tacked on as the `fields` property of the 2nd arg.
    //     If the 2nd arg already had `fields`, it is overridden.)
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
    // Finally, return the normalized result.
    return exits.success({
      result: normalizedNativeResult,
      meta: inputs.meta
    });
  }
};
