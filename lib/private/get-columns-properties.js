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
      description: 'Create manager with success'
    }
  },
  fn: async function getColumnsProperties({tablesProperties, tableName}, {success}) {
    return success(tablesProperties.filter(el => {
      return ((el.TABLE_NAME.toLowerCase() === tableName.toLowerCase()) ||
        (tableName.includes(' as ') && tableName.toLowerCase().includes(el.TABLE_NAME.toLowerCase())));
    }));
  }
});
