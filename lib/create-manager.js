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
      description: 'The manager was successfully created.',
      extendedDescription:
        'The new manager should be passed in to `getConnection()`.' +
        'Note that _no matter what_, this manager must be capable of ' +
        'spawning an infinite number of connections (i.e. via `getConnection()`).  ' +
        'The implementation of how exactly it does this varies on a driver-by-driver ' +
        'basis; and it may also vary based on the configuration passed into the `meta` input.',
      outputVariableName: 'report',
      outputDescription: 'The `manager` property is a manager instance that will be passed into `getConnection()`. The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
      // example: {
      //   manager: '===',
      //   meta: '==='
      // }
    },
    malformed: {
      description: 'The provided connection config is not valid for SQL Server.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that (and preferably "why") the provided connection string is invalid.  The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
      // example: {
      //   error: '===',
      //   meta: '==='
      // }
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
      outputDescription: 'The `error` property is a JavaScript Error instance with more information and a stack trace.  The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
      // outputExample: {
      //   error: '===',
      //   meta: '==='
      // }
    }
  },
  fn: async function createManager(inputs, exits) {
    // Create pool
    const createPool = require('./create-pool');
    let max = 1;
    if (inputs.connectionConfig) {
      if (inputs.connectionConfig.pool) {
        if (inputs.connectionConfig.pool.max > 0) {
          max = inputs.connectionConfig.pool.max;
        }
      }
    }
    let pools = [];
    for (let index = 0; index < max; index++) {
      const pool = await createPool({connectionConfig: inputs.connectionConfig});
      await pool.connect().catch(err => {
        console.error(err);
      });
      pools.push(pool);
    }
    let mgr = {
      connectionConfig: inputs.connectionConfig,
      pools
    };
    return exits.success({
      manager: mgr,
      meta: inputs.connectionConfig,
    });
  }
};
