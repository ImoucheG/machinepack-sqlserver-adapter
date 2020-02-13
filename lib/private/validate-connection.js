module.exports = require('machine').build({


  friendlyName: 'Validate connection',


  description: 'Check if this looks like a valid SQL Server connection instance.',


  sideEffects: 'cacheable',


  sync: true,


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

  },


  fn: function validateConnection(inputs, exits) {
    var _ = require('@sailshq/lodash');

    // Validate some basic assertions about the provided connection.
    // (this doesn't guarantee it's still active or anything, but it does let
    //  us know that it at least _HAS_ the properly formatted methods and properties
    //  necessary for internal use in this Waterline driver)
    return exits.success(
      _.isObject(inputs.connection) &&
      _.isFunction(inputs.manager.pool.query) &&
      _.isFunction(inputs.manager.pool.close) &&
      (
        // • If you are pooling: `.release()`
        _.isFunction(inputs.manager.pool.release) ||
        // • AND/OR if you are not pooling: `.end()`
        _.isFunction(inputs.manager.pool.close)
      )
    );
  }


});
