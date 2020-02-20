var assert = require('assert');
var Pack = require('../../');

describe('Connectable ::', function () {
  describe('Get Connection', function () {
    var manager;

    // Create a manager
    before(function (done) {
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

          // Assert that the report has a client object
          assert(report.connection);

          // Assert that the connection has a release function
          assert(manager.pool.release);

          return done();
        });
    });
  });
});
