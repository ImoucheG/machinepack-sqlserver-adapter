const assert = require('assert');
const configuration = require('../configuration');
const createPool = require('../../lib/create-pool');

describe('CreatePool', () => {
  it('should create a pool', function () {
    createPool({connectionConfig: configuration}).then(pool => {
      assert(pool);
      assert(!pool.connected);
    });
  });
});
