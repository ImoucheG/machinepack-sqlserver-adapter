var assert = require('assert');
var Pack = require('../../');

describe('Connectable ::', function() {
  describe('Release Connection', function() {
    var manager;
    var connection;

    // Create a manager and connection
    before(function(done) {
      Pack.createManager({
        connectionConfig: {
          user: 'mp',
          password: 'mp',
          host: '127.0.0.1\\SQLEXPRESS',
          database: 'mppg',
        }
      })
      .exec(function(err, report) {
        if (err) {
          return done(err);
        }

        manager = report.manager;

        Pack.getConnection({
          manager: manager
        })
        .exec(function(err, report) {
          if (err) {
            return done(err);
          }

          connection = report.connection;
          return done();
        });
      });
    });

    it('should successfully release a connection', function(done) {
      // Grab the number of free connections before releasing the current one
      try {
        var freeConnectionsPreRelease = manager.pool.available;
      } catch (e) {
        console.error(e);
      }
      // Release the connection
      Pack.releaseConnection({
        connection: connection,
        manager: manager
      })
      .exec(function(err) {
        if (err) {
          return done(err);
        }
        // If the connection was successfully released the _allConnections and the
        // _freeConnections should be equal.
        // https://github.com/mysqljs/mysql/blob/master/lib/Pool.js
        var poolSize = manager.pool.size;
        var freeConnectionsPostRelease = manager.pool.available;

        // Ensure we end up with different counts after releasing the connection
        assert.notEqual(freeConnectionsPostRelease, freeConnectionsPreRelease);

        // Ensure that all the available connections are free
        assert.equal(poolSize, freeConnectionsPostRelease);

        return done();
      });
    });
  });
});
