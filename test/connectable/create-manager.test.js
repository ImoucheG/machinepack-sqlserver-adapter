var assert = require('assert');
var Pack = require('../../');

describe('Connectable ::', function () {
  describe('Create Manager', function () {
    it('should work without a protocol in the connection string', function (done) {
      Pack.createManager({
        connectionConfig: {
          user: 'mp',
          password: 'mp',
          host: '127.0.0.1\\SQLEXPRESS',
          database: 'mppg',
          options: {
            encrypt: false
          }
        }
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
        connectionConfig: {
          user: 'mp',
          password: 'mp',
          host: '127.0.0.1\\SQLEXPRESS',
          database: 'mppg',
          options: {
            encrypt: false
          }
        }
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }

          // Assert that the manager has a pool object
          assert(report.manager.pools);
          assert(report.manager.pools[0]);

          // Assert that the manager has a connect function
          assert(report.manager.pools[0].connect);

          return done();
        });
    });
  });
});
