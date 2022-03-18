const assert = require('assert');
const Pack = require('../../');

describe('Queryable ::', function () {
  describe('Compile Statement', function () {
    it('should generate a SQL Statement from a WLQL query', function (done) {
      Pack.compileStatement({
        statement: {
          select: ['title', 'author', 'year'],
          from: 'books'
        }
      })
        .exec(function (err, report) {
          if (err) {
            return done(err);
          }
          assert.equal(report.nativeQuery, 'select [title], [author], [year] from [books]');
          return done();
        });
    });

    it('should return the malformed exit for bad WLQL', function (done) {
      Pack.compileStatement({
        statement: {
          foo: 'bar',
          from: 'books'
        }
      })
        .exec(function (err) {
          try {
            assert(err);
            assert.equal(err.exit, 'malformed', 'Instead got ' + err.stack);
          } catch (err2) {
            return done(err2);
          }
          return done();
        });
    });
  });
});
