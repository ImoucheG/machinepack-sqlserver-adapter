const SQLBuilder = require('waterline-sql-builder')({
  dialect: 'mssql'
});
module.exports = {
  friendlyName: 'Compile statement',
  description: 'Compile a Waterline statement to a native query for SQL Server.',
  sideEffects: 'cacheable',
  inputs: {
    statement: {
      description: 'A Waterline statement.',
      extendedDescription: 'See documentation for more information.  Note that `opts` may be used for expressing driver-specific customizations as a sibling to `from`, `where`, `select`, etc.  In other words, recursively deep within a Waterline query statement.  This is distinct from `meta`, which contains driver-specific customizations about the statement as a whole.',
      moreInfoUrl: 'https://github.com/particlebanana/waterline-query-builder/blob/master/docs/syntax.md',
      example: '===',
      // example: {},
      required: true
    },
    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional stuff to pass to the driver.',
      extendedDescription: 'This is reserved for custom driver-specific extensions.  Please refer to the documentation for the driver you are using for more specific information.',
      example: '==='
    }
  },
  exits: {
    success: {
      description: 'Create manager with success'
    }
  },
  fn: async function compileStatement({statement, meta}, {success}) {
    let compiledNativeQuery;
    try {
      compiledNativeQuery = SQLBuilder.generate(statement);
    } catch (err) {
      if (!err.code || err.code === 'error') {
        throw new Error('malformed');
      }
      throw err;
    }
    // Attach a flag to the meta object to denote that the query was generated
    // with Knex and that its valuesToEscape don't need to be processed any further.
    meta = meta || {};
    // Force collation
    if (meta.collate) {
      for (const [index, bind] of compiledNativeQuery.bindings.entries()) {
        if (bind[0] === '%' || bind[bind.length - 1] === '%' && compiledNativeQuery.sql.includes('@p' + index)) {
          compiledNativeQuery.sql = compiledNativeQuery.sql.replace('@p' + index, '@p' + index + ' collate ' + meta.collate);
        }
      }
    }
    if (meta.sortQuery && meta.sortQuery.toUpperCase().includes('ORDER BY')) {
      if (compiledNativeQuery.sql.includes('offset')) {
        const index = compiledNativeQuery.sql.indexOf('offset');
        compiledNativeQuery.sql = [compiledNativeQuery.sql.substr(0, index), meta.sortQuery,
          compiledNativeQuery.sql.substr(index, compiledNativeQuery.sql.length)].join(' ');

      } else {
        compiledNativeQuery.sql += ' ' + meta.sortQuery;
      }
    }
    meta.isUsingQuestionMarks = true;
    // Get id of line inserted
    if (statement.insert && !compiledNativeQuery.sql.toUpperCase().includes('SELECT') &&
      !compiledNativeQuery.sql.toUpperCase().includes('OUTPUT')) {
      compiledNativeQuery.sql += ' SELECT SCOPE_IDENTITY() as insertId';
    }
    return success({
      nativeQuery: compiledNativeQuery.sql,
      valuesToEscape: compiledNativeQuery.bindings || [],
      meta: meta
    });
  }
};
