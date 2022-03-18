module.exports = require('machine').pack({
  pkg: require('./package.json'),
  dir: __dirname
});
module.exports.mssql = require('mssql');
