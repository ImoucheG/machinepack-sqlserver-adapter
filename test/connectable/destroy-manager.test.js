var assert = require('assert');
var Pack = require('../../');

describe('Connectable ::', function () {
  describe('Destroy Manager', function () {
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


    it('should successfully destroy the manager', function (done) {
      Pack.destroyManager({
        manager: manager
      })
        .exec(function (err) {
          assert(!err);
          return done();
        });
    });
  });
});
