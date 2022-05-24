module.exports = require('machine').build({
  friendlyName: 'Validate connection',
  description: 'Check if this looks like a valid SQL Server connection instance.',
  sideEffects: 'cacheable',
  inputs: {
    connection: {
      friendlyName: 'Connection',
      description: 'An active database connection.',
      extendedDescription: 'The provided database connection instance must still be active.  Only database connection instances created by the `getConnection()` machine in this driver are supported.',
      example: '===',
      required: true
    }
  },
  exits: {
    success: {
      description: 'Create manager with success'
    }
  },
  fn: async function validateConnection({connection}, {success}) {
    let _ = require('@sailshq/lodash');
    const isValid = (
      _.isObject(connection));
    return success(isValid);
  }
});
