module.exports = {
  friendlyName: 'Destroy manager',
  description: 'Destroy the specified connection manager and destroy all of its active connections.',
  inputs: {
    manager: {
      friendlyName: 'Manager',
      description: 'The connection manager instance to destroy.',
      extendedDescription: 'Only managers built using the `createManager()` method of this driver are supported.  Also, the database connection manager instance provided must not have already been destroyed--i.e. once `destroyManager()` is called on a manager, it cannot be destroyed again (also note that all existing connections become inactive).',
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
  fn: async function destroyManager({manager, meta}, {success}) {
    for (const pool of manager.pools) {
      pool.close();
    }
    return success({
      meta: meta
    });
  }
};
