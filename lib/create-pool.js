module.exports = require('machine').build({
  friendlyName: 'Create pool',
  description: 'Build and initialize a connection with pool connection',
  inputs: {
    connectionConfig: {
      description: 'A connection config to use to connect to a SQL Server database.',
      extendedDescription: 'Be sure to include credentials.  You can also optionally provide the name of an existing database on your SQL' +
        ' server.',
      moreInfoUrl: 'https://www.npmjs.com/package/mssql',
      whereToGet: {
        url: 'https://www.npmjs.com/package/mssql'
      },
      example: '===',
      /** example:
       * const config = {
      user: '...',
      password: '...',
      server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
      database: '...',
      }*/
      required: true
    },
    onUnexpectedFailure: {
      description: 'A function to call any time an unexpected error event is received from this manager or any of its connections.',
      extendedDescription:
        'This can be used for anything you like, whether that\'s sending an email to devops, ' +
        'or something as simple as logging a warning to the console.\n' +
        '\n' +
        'For example:\n' +
        '```\n' +
        'onUnexpectedFailure: function (err) {\n' +
        '  console.warn(\'Unexpected failure in database manager:\',err);\n' +
        '}\n' +
        '```',
      example: '->'
    }
  },
  exits: {
    success: {
      description: 'The pool was successfully created.',
    },
    malformed: {
      description: 'The provided connection config is not valid for SQL Server.',
    },
    failed: {
      description: 'Could not create a connection pool for this database using the specified connection config.'
    }
  },
  fn: async function createPool(inputs, exits) {
    const util = require('util');
    const mssql = require('mssql');
    let sqlserverClientConfig = {};
    try {
      let configToTest = inputs.connectionConfig;
      let DEFAULT_HOST = 'localhost';
      let DEFAULT_PORT = 1433;

      if (configToTest.port) {
        sqlserverClientConfig.port = configToTest.port;
      } else {
        sqlserverClientConfig.port = DEFAULT_PORT;
      }

      if (configToTest.host) {
        sqlserverClientConfig.server = configToTest.host;
      } else {
        sqlserverClientConfig.server = DEFAULT_HOST;
      }

      if (configToTest.options) {
        sqlserverClientConfig.options = configToTest.options;
      } else {
        sqlserverClientConfig.options = {};
      }

      sqlserverClientConfig.options.enableArithAbort = true;


      sqlserverClientConfig.user = configToTest.user;
      sqlserverClientConfig.password = configToTest.password;
      sqlserverClientConfig.database = configToTest.database;
    } catch (err) {
      err.message = util.format('Provided value (`%s`) is not a valid Sql Server connection string.',
          JSON.stringify(inputs.connectionConfig)) + ' Error' +
        ' details: ' + err.message;
      return exits.malformed({
        error: err,
        meta: inputs.connectionConfig
      });
    }
    try {
      let pool = new mssql.ConnectionPool(sqlserverClientConfig);
      pool.on('error', function err(err) {
        if (inputs.onUnexpectedFailure) {
          inputs.onUnexpectedFailure(new Error('One or more pooled connections to SQL Server database were lost. Did the database' +
            ' server go offline?' + JSON.stringify(err)));
        }
      });
      return exits.success(pool);
    } catch (err) {
      return exits.failed({
        error: err,
        meta: inputs.connectionConfig
      });
    }
  }
});
