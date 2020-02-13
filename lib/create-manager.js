// Dependencies
var util = require('util');
var _ = require('@sailshq/lodash');
var mssql = require('mssql');

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
    'it might simply be a container for storing config, or it might refer to multiple pools ' +
    '(e.g. a PoolCluster from felixge\'s `mysql` package).',


  sync: true,


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
    },

    meta: {
      friendlyName: 'Meta (additional options)',
      description: 'Additional SQL Server-specific options to use when connecting.',
      extendedDescription: 'If specified, should be a dictionary. If there is a conflict between something provided in the connection string, and something in `meta`, the connection string takes priority.',
      moreInfoUrl: 'https://www.npmjs.com/package/mssql',
      example: '==='
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


  fn: function createManager(inputs, exits) {
    // Note:
    // Support for different types of managers is database-specific, and is not
    // built into the Waterline driver spec-- however this type of configurability
    // can be instrumented using `meta`.
    //
    // In particular, support for ad-hoc connections (i.e. no pool) and clusters/multiple
    // pools (see "PoolCluster": https://github.com/felixge/node-mysql/blob/v2.10.2/Readme.md#poolcluster)
    // could be implemented here, using properties on `meta` to determine whether or not
    // to have this manager produce connections ad-hoc, from a pool, or from a cluster of pools.
    //
    // Feel free to fork this driver and customize as you see fit.  Also note that
    // contributions to the core driver in this area are welcome and greatly appreciated!


    // Build a local variable (`_sqlserverClientConfig`) to house a dictionary
    // of additional Sql server options that will be passed into `.createPool()`
    // (Note that these could also be used with `.connect()` or `.createPoolCluster()`)
    //
    // This is pulled from the `connectionConfig` and `meta` inputs, and used for
    // configuring stuff like `host` and `password`.
    //
    // For a complete list of available options, see:
    //  • https://github.com/felixge/node-mysql#connection-options
    //
    // However, note that supported options are explicitly whitelisted below.
    var _sqlserverClientConfig = {};


    // Validate and parse `meta` (if specified).
    /*if (!_.isUndefined(inputs.meta)) {
      if (!_.isObject(inputs.meta)) {
        return exits.error('If provided, `meta` must be a dictionary.');
      }

      // Use properties of `meta` directly as SQL Server client config.
      // (note that we're very careful to only stick a property on the client config
      //  if it was not undefined, just in case that matters)
      [
        // MySQL Client Options:
        // ============================================

        // Basic:
        'host', 'port', 'database', 'user', 'password',
        'charset', 'timezone', 'ssl', 'socketPath',

        // Advanced:
        'connectTimeout', 'stringifyObjects', 'insecureAuth', 'typeCast',
        'queryFormat', 'supportBigNumbers', 'bigNumberStrings', 'dateStrings',
        'debug', 'trace', 'multipleStatements', 'flags',

        // Pool-specific:
        'acquireTimeout', 'waitForConnections', 'connectionLimit', 'queueLimit',

      ].forEach(function processKey(mysqlClientConfKeyName) {
        if (!_.isUndefined(inputs.meta[mysqlClientConfKeyName])) {
          _mysqlClientConfig[mysqlClientConfKeyName] = inputs.meta[mysqlClientConfKeyName];
        }
      });


      // In the future, other special properties of `meta` could be used
      // as options for the manager-- e.g. whether or not to use pooling,
      // or the connection strings of replicas, etc.

      // // Now use other special properties of `meta` as our higher-level
      // // logical machinepack options.
      // [
      //   // Machinepack Configuration:
      //   // ============================================
      //   '',
      // ].forEach(function (pkgConfKeyName) {
      //   // ...
      // });
    }*/


    // Validate & parse connection string, pulling out Sql Server client config
    // (call `malformed` if invalid).
    //
    // Remember: connection string takes priority over `meta` in the event of a conflict.
    try {
      var configToTest = inputs.connectionConfig;
      // We don't actually care about the protocol, but `url.parse()` returns funky results
      // if the argument doesn't have one.  So we'll add one if necessary.
      // See https://en.wikipedia.org/wiki/Uniform_Resource_Identifier#Syntax
      // Parse port & host
      var DEFAULT_HOST = 'localhost';
      var DEFAULT_PORT = 1433;
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
        meta: inputs.meta
      });
    }

    // Create a connection pool.
    //
    var pool = new mssql.ConnectionPool(_sqlserverClientConfig);

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

    // Finally, build and return the manager.
    var mgr = {
      pool: pool,
      connectionConfig: inputs.connectionConfig
    };
    return exits.success({
      manager: mgr,
      meta: inputs.meta,
    });
  }


};
