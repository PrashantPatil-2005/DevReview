/**
 * Browser-Compatible AST Parser
 * 
 * Uses @babel/parser browser build. Same logic as server version but ESM exports.
 * This module NEVER makes any network requests.
 */

import * as parser from '@babel/parser';

/**
 * Parses JavaScript/TypeScript code into an AST using Babel parser.
 * @param {string} code - Raw JavaScript/TypeScript code
 * @returns {{ ast: object|null, error: string|null }}
 */
export function parseCode(code) {
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
