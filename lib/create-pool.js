const util = require('util');
const _ = require('@sailshq/lodash');
const mssql = require('mssql');

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
    let _sqlserverClientConfig = {};
    try {
      let configToTest = inputs.connectionConfig;
      let DEFAULT_HOST = 'localhost';
      let DEFAULT_PORT = 1433;
      if (configToTest.port) {
        _sqlserverClientConfig.port = +configToTest.port;
      } else {
        _sqlserverClientConfig.port = DEFAULT_PORT;
      }
      if (configToTest.host) {
        _sqlserverClientConfig.server = configToTest.host;
      } else {
        _sqlserverClientConfig.server = DEFAULT_HOST;
      }
      if (configToTest.options) {
        _sqlserverClientConfig.options = configToTest.options;
      } else {
        _sqlserverClientConfig.options = {};
      }
      _sqlserverClientConfig.options.enableArithAbort = true;
      // Parse user & password
      if (configToTest.user) {
        _sqlserverClientConfig.user = configToTest.user;
      }
      if (configToTest.password) {
        _sqlserverClientConfig.password = configToTest.password;
      }
      // Parse database name
      if (_.isString(configToTest.database)) {
        _sqlserverClientConfig.database = configToTest.database;
      }
    } catch (_e) {
      _e.message = util.format('Provided value (`%s`) is not a valid Sql Server connection string.', JSON.stringify(inputs.connectionConfig)) + ' Error' +
        ' details: ' + _e.message;
      return exits.malformed({
        error: _e,
        meta: inputs.connectionConfig
      });
    }
    // Create a connection pool.
    //
    let pool = new mssql.ConnectionPool(_sqlserverClientConfig);
    // Bind an "error" handler in order to handle errors from connections in the pool,
    // or from the pool itself. Otherwise, without any further protection, if any SQL Server
    // connections in the pool die, then the process would crash with an error.
    //
    pool.on('error', function err(err) {
      // When/if something goes wrong in this pool, call the `onUnexpectedFailure` notifier
      // (if one was provided)
      if (!_.isUndefined(inputs.onUnexpectedFailure)) {
        inputs.onUnexpectedFailure(err || new Error('One or more pooled connections to SQL Server database were lost. Did the database' +
          ' server go offline?'));
      }
    });
    await pool.connect().catch((err) => {
      if (err) {
        return exits.failed({
          error: err,
          meta: inputs.connectionConfig
        });
      }
    });
    return exits.success(pool);
  }
});
