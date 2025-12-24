const parser = require('@babel/parser');

/**
 * Parses JavaScript code into an AST using Babel parser.
 * @param {string} code - Raw JavaScript code
 * @returns {{ ast: object|null, error: string|null }}
 */
function parseCode(code) {
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'optionalChaining',
        'nullishCoalescingOperator',
        'dynamicImport',
        'asyncGenerators',
        'objectRestSpread',
      ],
      errorRecovery: false,
    });
    return { ast, error: null };
  } catch (err) {
    return {
      ast: null,
      error: `Syntax Error: ${err.message}`,
    };
  }
}

module.exports = { parseCode };
