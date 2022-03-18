const assert = require('assert');
const Pack = require('../../');
const configuration = require('../configuration');

describe('Connectable ::', function () {
  describe('Destroy Manager', function () {
    let manager;
    before(function (done) {
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
