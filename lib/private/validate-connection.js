module.exports = require('machine').build({
  friendlyName: 'Validate connection',
  description: 'Check if this looks like a valid SQL Server connection instance.',
  sideEffects: 'cacheable',
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
      outputFriendlyName: 'Is probably SQL Server connection',
      outputDescription: 'If the provided appears to be a valid SQL Server connection instance.',
      outputExample: true
    },
    invalid: {
      outputFriendlyName: 'Has probably error in connection',
      outputDescription: 'If the provided appears a error.',
      outputExample: true
    },
  },
  fn: async function validateConnection(inputs, exits) {
    try {
      let _ = require('@sailshq/lodash');
      // Validate some basic assertions about the provided connection.
      // (this doesn't guarantee it's still active or anything, but it does let
      //  us know that it at least _HAS_ the properly formatted methods and properties
      //  necessary for internal use in this Waterline driver)
      const isValid = (
        _.isObject(inputs.connection));
      return exits.success(isValid);
    } catch (e) {
      return exits.invalid(e);
    }
  }
});
