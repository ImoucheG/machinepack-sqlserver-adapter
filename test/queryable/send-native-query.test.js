var assert = require('assert');
var _ = require('@sailshq/lodash');
var Pack = require('../../');

describe('Queryable ::', function () {
  describe('Send Native Query', function () {
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
        }
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }

          // Store the manager
          manager = report.manager;

          Pack.getConnection({
            manager: manager
          })
            .exec(function (err, report) {
              if (err) {
                return done(err);
              }

              // Store the connection
              connection = report.connection;

              // Create a table to use for testing
              // Uses sendNativeQuery but doesn't get rows or anything.
              // TODO: figure out a query that can run with the given permissions
              // that doesn't need an additional table
              Pack.sendNativeQuery({
                connection: connection,
                manager: manager,
                nativeQuery: 'IF NOT EXISTS (SELECT * FROM sysobjects WHERE name=\'people\' and xtype=\'U\')\n' +
                  '    CREATE TABLE people (\n' +
                  '        name varchar(255) not null \n' +
                  '        CONSTRAINT AK_Name UNIQUE(name)  )'
              })
                .exec(function (err) {
                  if (err) {
                    return done(err);
                  }
                  Pack.sendNativeQuery({
                    connection: connection,
                    manager: manager,
                    nativeQuery: 'INSERT INTO people values(\'Batman\')'
                  })
                    .exec(function (err) {
                      if (err) {
                        return done(err);
                      }
                      return done();
                    });
                });
            });
        });
    });

    // Afterwards release the connection
    after(function (done) {
      Pack.sendNativeQuery({
        connection: connection,
        manager: manager,
        nativeQuery: 'DROP TABLE people;'
      })
        .exec(function (err) {
          if (err) {
            return done(err);
          }

          Pack.releaseConnection({
            connection: connection,
            manager: manager,
          }).exec(done);
        });
    });

    it('should run a native query and return the reports', function (done) {
      Pack.sendNativeQuery({
        connection: connection,
        manager: manager,
        nativeQuery: 'select * from people;'
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }
          assert(_.isArray(report.result.rows));
          return done();
        });
    });
  });
});
