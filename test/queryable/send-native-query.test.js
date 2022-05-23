const assert = require('assert');
const _ = require('@sailshq/lodash');
const Pack = require('../../');
const configuration = require('../configuration');
const age = parseInt((Math.random() * 100).toFixed(0));
describe('Queryable ::', function () {
  describe('Send Native Query', function () {
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
              Pack.sendNativeQuery({
                connection: connection,
                manager: manager,
                nativeQuery: 'IF NOT EXISTS (SELECT * FROM sysobjects WHERE name=\'people\' and xtype=\'U\')\n' +
                  '    CREATE TABLE people (\n' +
                  '        id uniqueidentifier,  \n' +
                  '        name varchar(255) not null, \n' +
                  '        birthDate datetime, \n' +
                  '        age int, \n' +
                  '        description text, \n' +
                  '        CONSTRAINT AK_Name UNIQUE(name)  )'
              })
                .exec(function (err) {
                  if (err) {
                    return done(err);
                  }
                  Pack.sendNativeQuery({
                    connection: connection,
                    manager: manager,
                    nativeQuery: `INSERT INTO people(id, name, age, description, birthDate)
                                  values ('b751022d-0df9-458f-9a4d-44d8b3008f68', 'Batman${Math.random()}',
                                          ${age},
                                          'description', '2022-03-18T05:30:00.000Z')`
                  })
                    .exec(function (err) {
                      if (err) {
                        return done(err);
                      }
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
    it('should run a prepared statement', function (done) {
      Pack.sendNativeQuery({
        connection: connection,
        statement: {
          columns: ['age'],
          tableName: 'PEOPLE'
        },
        valuesToEscape: [age],
        manager: manager,
        nativeQuery: 'select [id], [name],[birthDate],[description],[age] from people where [age]=@p0;',
        meta: {isUsingQuestionMarks: true}
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
