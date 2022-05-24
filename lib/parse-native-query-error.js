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
      description: 'Create manager with success'
    }
  },
  fn: async function parseNativeQueryError({nativeQueryError, meta}, {success}) {
    let footprint = {identity: 'catchall'};
    if (!nativeQueryError || !nativeQueryError.code) {
      return success({
        footprint: footprint,
        meta: meta
      });
    }
    if (nativeQueryError && nativeQueryError.raw && nativeQueryError.raw.precedingErrors &&
      nativeQueryError.raw.precedingErrors.find(el => el.stack.includes('Violation of UNIQUE KEY constraint'))) {
      footprint = {
        identity: 'notUnique',
        keys: []
      };
    } else {
      if (nativeQueryError.code === 'queryFailed') {
        footprint = {
          identity: 'queryFailed'
        };
      }
    }
    footprint.keys = nativeQueryError.raw.precedingErrors;
    return success({
      footprint: footprint,
      date: new Date().toISOString(),
      message: nativeQueryError.raw.message + '\n' + nativeQueryError.raw.precedingErrors.map(el => el.message + '\n'),
      meta: meta
    });
  }
};
