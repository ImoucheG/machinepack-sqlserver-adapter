module.exports = {
  friendlyName: 'Get connection',
  description: 'Get an active connection to a Sql Sever database from the pool.',
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
      required: true
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
      description: 'Create manager with success'
    }
  },
  fn: async function getConnection({manager, meta}, {success}) {
    let currentPool = manager.pools.find(el => el.connected && el.pool.used.length === 0);
    if (!currentPool) {
      currentPool = manager.pools.find(el => !el.connected);
      if (currentPool) {
        currentPool = await currentPool.connect();
      }
    }
    if (!currentPool) {
      currentPool = manager.pools.find(el => el.connected && el.pool.used.length < 5);
    }
    if (!currentPool) {
      currentPool = manager.pools.find(el => el.connected);
    }
    if (currentPool) {
      return success({
        connection: currentPool,
        meta: meta
      });
    } else {
      throw new Error('Cannot acquire a pool');
    }
  }
};
