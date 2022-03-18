const mssql = require('mssql');
module.exports = require('machine').build({
  friendlyName: 'Get params',
  description: 'Get prepared inputs for request',
  sideEffects: 'cacheable',
  inputs: {
    values: {
      type: 'ref',
      required: false
    },
    statement: {
      type: 'ref',
      required: false
    },
    sql: {
      type: 'string',
      required: true
    },
    connection: {
      type: 'ref',
      required: true
    },
    preparedStatement: {
      type: 'ref',
      required: true
    }
  },
  exits: {
    success: {
      outputFriendlyName: 'Get parameters of request'
    },
    invalid: {
      outputFriendlyName: 'Has probably error in connection'
    },
    queryFailed: {
      outputFriendlyName: 'Has probably error in query'
    },
  },
  fn: async function getParams(inputs, exits) {
    const getColumnsProperties = require('./get-columns-properties');
    try {
      const params = [];
      if (inputs.values && inputs.values.length > 0) {
        let i = 0;
        if (inputs.statement && inputs.statement.columns && inputs.statement.tableName) {
          const typesMap = [];
          const columnsProperties = await getColumnsProperties({
            tableName: inputs.statement.tableName,
            connection: inputs.connection
          });
          for (let column of inputs.statement.columns) {
            let currentValue = inputs.values[i];
            column = column.split('.');
            column = column[column.length - 1];

            if (inputs.sql.includes('top (@p' + i.toString() + ')') || inputs.sql.includes('@p' + i.toString() + ' rows')) {
              inputs.preparedStatement.input('p' + i.toString(), mssql.BigInt());
              params['p' + i.toString()] = currentValue;
              i++;
            }
            currentValue = inputs.values[i];
            const startIndex = (i - 1) > 0 ? (i - 1) : 0;
            const endIndex = i;
            const parameterPart = inputs.sql.substr(inputs.sql.indexOf('@p' + startIndex),
              ((inputs.sql.indexOf('@p' + endIndex) + 4) - inputs.sql.indexOf('@p' + startIndex)));

            if (!typesMap.find(el => el.column === column) && inputs.sql.includes(column)) {
              if (inputs.values.length >= i && inputs.sql.includes('@p' + i.toString())) {
                let type;
                const columnProperty = columnsProperties.find(el => el['COLUMN_NAME'].toLowerCase() === column.toLowerCase());
                let numberCharactersSpecials = 0;
                if (currentValue && typeof currentValue === 'string') {
                  const match = currentValue.match(/%/g) || [];
                  if (match) {
                    numberCharactersSpecials = match.length;
                  }
                }
                if (!columnProperty) {
                  return exits.queryFailed({error: {message: `${column} not exist in table ${inputs.statement.tableName} check your model`}});
                }
                if (columnProperty.CHARACTER_MAXIMUM_LENGTH && currentValue && columnProperty.DATA_TYPE !== 'xml') {
                  if (columnProperty.CHARACTER_MAXIMUM_LENGTH !== -1 &&
                    currentValue.length > (columnProperty.CHARACTER_MAXIMUM_LENGTH + numberCharactersSpecials)) {
                    return exits.queryFailed({
                      error: {
                        message: 'Column ' + column + ' is too many large with this value ' + currentValue +
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
                    if (columnProperty.CHARACTER_MAXIMUM_LENGTH < 0 || !columnProperty.CHARACTER_MAXIMUM_LENGTH) {
                      columnProperty.CHARACTER_MAXIMUM_LENGTH = 1000;
                    }
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
                    if (currentValue.includes('<?xml')) {
                      currentValue = currentValue.substr(currentValue.indexOf('?>') + 2,
                        currentValue.length);
                    }
                    type = mssql.Xml();
                    break;
                  default:
                    type = mssql.VarChar(columnProperty.CHARACTER_MAXIMUM_LENGTH);
                    break;
                }
                if (Buffer.isBuffer(currentValue)) {
                  type = mssql.VarBinary(mssql.MAX);
                }
                if ((!parameterPart.includes(`[${column}] is not null`) && !parameterPart.includes(`[${column}] is null`)) ||
                  parameterPart.includes(`[${column}] =`) ||
                  parameterPart.includes(`[${column}] >`) || parameterPart.includes(`[${column}] <`) ||
                  parameterPart.includes(`[${column}] !=`)) {
                  typesMap.push({type, column});
                  inputs.preparedStatement.input('p' + i.toString(), type);
                  params['p' + i.toString()] = currentValue;
                  i++;
                }
              }
            } else {
              if ((!parameterPart.includes(`[${column}] is not null`) && !parameterPart.includes(`[${column}] is null`)) ||
                parameterPart.includes(`[${column}] =`) ||
                parameterPart.includes(`[${column}] >`) ||
                parameterPart.includes(`[${column}] <`) ||
                parameterPart.includes(`[${column}] !=`)) {
                const colProperty = typesMap.find(el => el.column === column);
                if (colProperty) {
                  inputs.preparedStatement.input('p' + i.toString(), colProperty.type);
                  params['p' + i.toString()] = currentValue;
                  i++;
                }
              }
            }
          }
        }
        if (inputs.values.length > inputs.statement.columns.length) {
          i = inputs.statement.columns.length;
          while (i < inputs.values.length) {
            const currentValue = inputs.values[i];
            if (inputs.sql.includes('top (@p' + i.toString() + ')') || inputs.sql.includes('@p' + i.toString() + ' rows')) {
              inputs.preparedStatement.input('p' + i.toString(), mssql.BigInt());
              params['p' + i.toString()] = currentValue;
            }
            i++;
          }
        }
      }
      return exits.success({preparedStatement: inputs.preparedStatement, params});
    } catch (err) {
      console.error(err);
      return exits.invalid(err);
    }
  }
});
