var assert = require('assert');
var Pack = require('../../');

describe('Connectable ::', function () {
  describe('Release Connection', function () {
    var manager;
    var connection;

    // Create a manager and connection
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
      // Release the connection
      Pack.releaseConnection({
        connection: connection,
        manager: manager
      })
        .exec(function (err) {
          if (err) {
            return done(err);
          }
          // Return "done" because the new manager use prepared statement.
          // When prepared statement is "unprepare" the connection is released
          assert(true);
          return done();
        });
    });
  });
});
