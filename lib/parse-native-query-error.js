module.exports = {
  friendlyName: 'Parse native query error',
  description: 'Attempt to identify and parse a raw error from sending a native query and normalize it to a standard error footprint.',
  moreInfoUrl: 'https://github.com/node-machine/waterline-driver-interface#footprints',
  sideEffects: 'cacheable',
  inputs: {
    nativeQueryError: {
      description: 'The error sent back from the database as a result of a failed native query.',
      extendedDescription: 'This is referring to the raw error; i.e. the `error` property of the dictionary returned through the `queryFailed` exit of `sendNativeQuery()` in this driver.',
      required: true,
      example: '==='
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
      description: 'The normalization is complete.  If the error cannot be normalized into any other more specific footprint, then the catchall footprint will be returned.',
      moreInfoUrl: 'https://github.com/node-machine/waterline-driver-interface#footprints',
      outputVariableName: 'report',
      outputDescription: 'The `footprint` property is the normalized "footprint" representing the provided raw error.  Conforms to one of a handful of standardized footprint types expected by the Waterline driver interface.   The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: '==='
    },
  },
  fn: async function parseNativeQueryError({nativeQueryError, meta}, exits) {
    const _ = require('@sailshq/lodash');
    let footprint = {identity: 'catchall'};
    if (!nativeQueryError || !nativeQueryError.code) {
      return exits.success({
        footprint: footprint,
        meta: meta
      });
    }
    if (nativeQueryError.code === 'EREQUEST' && nativeQueryError.stack.includes('Statement(s) could not be prepared')) {
      if (!footprint.keys) {
        footprint.key = [];
      }
      footprint.keys.push(nativeQueryError.precedingErrors);
    }
    if (nativeQueryError.code === 'EREQUEST' && nativeQueryError.stack.includes('Violation of UNIQUE KEY constraint')) {
      footprint = {
        identity: 'notUnique',
        keys: []
      };
      if (_.isString(nativeQueryError.message)) {
        const matches = nativeQueryError.message.match(/Violation of UNIQUE KEY constraint '(.*?)'/);
        if (matches && matches.length > 0) {
          footprint.keys.push(matches[1]);
        }
      }
    }
    if (nativeQueryError.code === 'queryFailed') {
      footprint = {
        identity: 'queryFailed',
        keys: nativeQueryError.raw.error.precedingErrors
      };
      nativeQueryError.message = nativeQueryError.raw.error.message;
    }
    return exits.success({
      footprint: footprint,
      message: nativeQueryError.message,
      meta: meta
    });
  }
};
