const assert = require('assert');
const Pack = require('../../');
const configuration = require('../configuration');

describe('Connectable ::', function () {
  describe('Create Manager', function () {
    it('should work without a protocol in the connection string', function (done) {
      Pack.createManager({
        connectionConfig: configuration
      })
        .exec(function (err) {
          if (err) {
            return done(err);
          }
          return done();
        });
    });

    it('should successfully return a Pool', function (done) {
      Pack.createManager({
        connectionConfig: configuration
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }
          assert(report.manager.pools);
          assert(report.manager.pools[0]);
          assert(report.manager.pools[0].connect);
          return done();
        });
    });
  });
});
