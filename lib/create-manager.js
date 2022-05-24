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
    }
  },
  exits: {
    success: {
      description: 'Create manager with success'
    }
  },
  fn: async function createManager({connectionConfig}, {success}) {
    const createPool = require('./create-pool');
    const getTablesProperties = require('./private/get-tables-definitions');
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
            return success({
              manager,
              meta: connectionConfig,
            });
          });
        }
      });
    }
  }
};
