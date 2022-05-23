module.exports = require('machine').build({
  friendlyName: 'Get columns properties',
  sideEffects: 'cacheable',
  inputs: {
    tablesProperties: {
      type: 'ref',
      required: true
    },
    tableName: {
      type: 'string',
      required: true
    }
  },
  exits: {
    success: {
      outputFriendlyName: 'Get columns properties'
    },
    invalid: {
      outputFriendlyName: 'Has probably error in connection'
    },
    queryFailed: {
      outputFriendlyName: 'Has probably error in connection'
    },
  },
  fn: async function getColumnsProperties({tablesProperties, tableName}, exits) {
    try {
      return exits.success(tablesProperties.filter(el => el.TABLE_NAME.toLowerCase() === tableName.toLowerCase()));
    } catch (e) {
      return exits.invalid(e);
    }
  }
});
