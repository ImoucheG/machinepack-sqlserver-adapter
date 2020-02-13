var assert = require('assert');
var _ = require('@sailshq/lodash');
var Pack = require('../../index');

describe('Queryable ::', function () {
  describe('Parse Native Query Error', function () {
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

                  return done();
                });
            });
        });
    });

    // Afterwards destroy the test table and release the connection
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
            manager: manager
          }).exec(done);
        });
    });

    it('should normalize UNIQUE constraint errors', function (done) {
      // Insert two records with identical names
      Pack.sendNativeQuery({
        connection: connection,
        manager: manager,
        nativeQuery: 'INSERT INTO people VALUES (\'Batman\'), (\'Batman\');'
      })
        .exec(function (err) {
          assert(err);
          assert.equal(err.exit, 'queryFailed');

          Pack.parseNativeQueryError({
            nativeQueryError: err.raw.error
          })
            .exec(function (err, report) {
              if (err) {
                return done(err);
              }

              assert(report.footprint);
              assert(report.footprint.identity);
              assert.equal(report.footprint.identity, 'notUnique');
              assert(_.isArray(report.footprint.keys));
              assert.equal(report.footprint.keys.length, 1);
              assert.equal(_.first(report.footprint.keys), 'AK_Name');

              return done();
            });
        });
    });
  });
});
