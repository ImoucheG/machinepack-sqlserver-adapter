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
    }
  },
  exits: {
    success: {
      description: 'Pool created with success'
    }
  },
  fn: async function createPool({connectionConfig}, {success}) {
    const mssql = require('mssql');
    const sqlserverClientConfig = {
      port: 1433,
      server: 'localhost',
      options: {}
    };
    try {
      if (connectionConfig.port) {
        sqlserverClientConfig.port = connectionConfig.port;
      }
      if (connectionConfig.host) {
        sqlserverClientConfig.server = connectionConfig.host;
      }
      if (connectionConfig.options) {
        sqlserverClientConfig.options = connectionConfig.options;
      }
      if (connectionConfig.requestTimeout) {
        if (typeof connectionConfig.requestTimeout === 'string') {
          connectionConfig.requestTimeout = parseInt(connectionConfig.requestTimeout, 10);
        }
        sqlserverClientConfig.requestTimeout = connectionConfig.requestTimeout;
      }
      if (connectionConfig.connectionTimeout) {
        if (typeof connectionConfig.connectionTimeout === 'string') {
          connectionConfig.connectionTimeout = parseInt(connectionConfig.connectionTimeout, 10);
        }
        sqlserverClientConfig.connectionTimeout = connectionConfig.connectionTimeout;
      }
      sqlserverClientConfig.options.enableArithAbort = true;
      sqlserverClientConfig.user = connectionConfig.user;
      sqlserverClientConfig.password = connectionConfig.password;
      sqlserverClientConfig.database = connectionConfig.database;
    } catch (err) {
      err.message = 'Configuration is not valid' + err.message;
      throw err;
    }
    const pool = new mssql.ConnectionPool(sqlserverClientConfig);
    pool.on('error', function err(err) {
      if (connectionConfig.onUnexpectedFailure) {
        connectionConfig.onUnexpectedFailure(new Error('One or more pooled connections to SQL Server database were lost. Did the database' +
          ' server go offline?' + JSON.stringify(err)));
      }
    });
    return success(pool);
  }
});
