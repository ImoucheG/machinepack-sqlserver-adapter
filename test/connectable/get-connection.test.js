const assert = require('assert');
const Pack = require('../../');
const configuration = require('../configuration');

describe('Connectable ::', function () {
  describe('Get Connection', function () {
    let manager;
    before(function (done) {
      Pack.createManager({
        connectionConfig: configuration
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }
          manager = report.manager;
          return done();
        });
    });

    it('should successfully return a connection instance', (done) => {
      Pack.getConnection({
        manager: manager
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }
          assert(report.connection);
          assert(report.connection.connected);
          assert(report.connection.pool.release);
          return done();
        });
    });
  });
});
