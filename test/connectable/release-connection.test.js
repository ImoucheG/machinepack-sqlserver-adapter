const assert = require('assert');
const Pack = require('../../');
const configuration = require('../configuration');

describe('Connectable ::', function () {
  describe('Release Connection', function () {
    let manager;
    let connection;
    before(function (done) {
      Pack.createManager({
        connectionConfig: configuration
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }
          manager = report.manager;
          Pack.getConnection({
            manager: manager
          })
            .exec(function (err, report) {
              if (err) {
                return done(err);
              }
              connection = report.connection;
              return done();
            });
        });
    });

    it('should successfully release a connection', function (done) {
      Pack.releaseConnection({
        connection: connection,
        manager: manager
      })
        .exec(function (err) {
          if (err) {
            return done(err);
          }
          assert(true);
          return done();
        });
    });
  });
});
