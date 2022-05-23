module.exports = {
  friendlyName: 'Create manager',
  description: 'Build and initialize a connection manager instance for this database.',
  extendedDescription:
    'The `manager` instance returned by this method contains any configuration that is necessary ' +
    'for communicating with the database and establishing connections (e.g. host, user, password) ' +
    'as well as any other relevant metadata.  The manager will often also contain a reference ' +
    'to some kind of native container (e.g. a connection pool).\n' +
    '\n' +
    'Note that a manager instance does not necessarily need to correspond with a pool though--' +
    'it might simply be a container for storing config, or it might refer to multiple pools ',
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
      description: 'The manager was successfully created.',
      extendedDescription:
        'The new manager should be passed in to `getConnection()`.' +
        'Note that _no matter what_, this manager must be capable of ' +
        'spawning an infinite number of connections (i.e. via `getConnection()`).  ' +
        'The implementation of how exactly it does this varies on a driver-by-driver ' +
        'basis; and it may also vary based on the configuration passed into the `meta` input.',
      outputVariableName: 'report',
      outputDescription: 'The `manager` property is a manager instance that will be passed into `getConnection()`.' +
        ' The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
    },
    failed: {
      description: 'Could not create a connection manager for this database using the specified connection config.',
      extendedDescription:
        'If this exit is called, it might mean any of the following:\n' +
        ' + the credentials encoded in the connection string are incorrect\n' +
        ' + there is no database server running at the provided host (i.e. even if it is just that the database process needs to be started)\n' +
        ' + there is no software "database" with the specified name running on the server\n' +
        ' + the provided connection string does not have necessary access rights for the specified software "database"\n' +
        ' + this Node.js process could not connect to the database, perhaps because of firewall/proxy settings\n' +
        ' + any other miscellaneous connection error\n' +
        '\n' +
        'Note that even if the database is unreachable, bad credentials are being used, etc, ' +
        'this exit will not necessarily be called-- that depends on the implementation of the driver ' +
        'and any special configuration passed to the `meta` input. e.g. if a pool is being used that spins up ' +
        'multiple connections immediately when the manager is created, then this exit will be called if any of ' +
        'those initial attempts fail.  On the other hand, if the manager is designed to produce adhoc connections, ' +
        'any errors related to bad credentials, connectivity, etc. will not be caught until `getConnection()` is called.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance with more information and a stack trace.' +
        '  The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
    }
  },
  fn: async function createManager({connectionConfig}, exits) {
    const createPool = require('./create-pool');
    const getTablesProperties = require('./private/get-tables-definitions');
    try {
      let maxPool = 1;
      if (connectionConfig && connectionConfig.pool && connectionConfig.pool.max &&
        parseInt(connectionConfig.pool.max, 10) > 0) {
        maxPool = parseInt(connectionConfig.pool.max, 10);
      }
      const pools = [];
      for (let index = 0; index < maxPool; index++) {
        createPool({connectionConfig: connectionConfig}).then(async (pool) => { // jshint ignore:line
          pools.push(pool);
          if (pools.length === maxPool) {
            const manager = {
              connectionConfig: connectionConfig,
              pools
            };
            await manager.pools[0].connect();
            getTablesProperties({connection: manager.pools[0]}).then((report) => {
              manager.tablesProperties = report[0];
              return exits.success({
                manager,
                meta: connectionConfig,
              });
            });
          }
        });
      }
    } catch (err) {
      return exits.failed(err);
    }
  }
};
