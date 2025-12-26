/**
 * Browser-Compatible Edge Cases Analyzer
 * 
 * Same logic as server version but ESM exports.
 * This module NEVER makes any network requests.
 */

import * as _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

export const MAX_SCORE = 25;

const PENALTIES = {
    ASYNC_NO_TRY_CATCH: 4,
    UNCHECKED_ARRAY_ACCESS: 3,
    UNCHECKED_EXTERNAL_INPUT: 3,
};

/**
 * Analyzes edge case handling from AST
 * @param {object} ast - Babel AST
 * @returns {{ penalty: number, comment: string }[]}
 */
export function analyzeEdgeCases(ast) {
    const issues = [];

    checkAsyncWithoutTryCatch(ast, issues);
    checkUncheckedArrayAccess(ast, issues);
    checkUncheckedExternalInput(ast, issues);

    return issues;
}

/**
 * Detects async functions that don't have try/catch
 */
function checkAsyncWithoutTryCatch(ast, issues) {
    const reportedFunctions = new Set();

    traverse(ast, {
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
            if (!path.node.async) return;

            const funcName = getFunctionName(path);
            if (reportedFunctions.has(funcName)) return;

            // Check if function body has try/catch
            let hasTryCatch = false;
            let hasAwait = false;

            path.traverse({
                TryStatement() {
                    hasTryCatch = true;
                },
                AwaitExpression() {
                    hasAwait = true;
                },
            });

            if (hasAwait && !hasTryCatch) {
                reportedFunctions.add(funcName);
                const line = path.node.loc?.start.line || 'unknown';
                issues.push({
                    penalty: PENALTIES.ASYNC_NO_TRY_CATCH,
                    comment: `Async function ${funcName} at line ${line} uses await without try/catch. Unhandled rejections may occur.`,
                });
            }
        },
    });
}

/**
 * Detects array access without length/null checks
 */
function checkUncheckedArrayAccess(ast, issues) {
    const checkedIdentifiers = new Set();
    const reportedLines = new Set();

    // First pass: find all identifiers that are checked
    traverse(ast, {
        // arr.length checks
        MemberExpression(path) {
            if (
                path.node.property.type === 'Identifier' &&
                path.node.property.name === 'length' &&
                isInCondition(path)
            ) {
                if (path.node.object.type === 'Identifier') {
                    checkedIdentifiers.add(path.node.object.name);
                }
            }
        },

        // Array.isArray(arr) checks
        CallExpression(path) {
            if (
                path.node.callee.type === 'MemberExpression' &&
                path.node.callee.object.name === 'Array' &&
                path.node.callee.property.name === 'isArray' &&
                isInCondition(path)
            ) {
                const arg = path.node.arguments[0];
                if (arg?.type === 'Identifier') {
                    checkedIdentifiers.add(arg.name);
                }
            }
        },

        // null/undefined checks
        BinaryExpression(path) {
            if (
                (path.node.operator === '!=' || path.node.operator === '!==') &&
                isInCondition(path)
            ) {
                if (path.node.left.type === 'Identifier' && isNullish(path.node.right)) {
                    checkedIdentifiers.add(path.node.left.name);
                }
            }
        },
    });

    // Second pass: find array accesses without prior checks
    traverse(ast, {
        MemberExpression(path) {
            if (!path.node.computed) return;

            const object = path.node.object;
            const property = path.node.property;

            // Check if accessing by index
            if (property.type !== 'NumericLiteral' && property.type !== 'Identifier') return;

            // Skip if object is already checked
            if (object.type === 'Identifier' && checkedIdentifiers.has(object.name)) return;

            // Skip safe patterns
            if (isSafeArrayAccess(path)) return;

            const line = path.node.loc?.start.line;
            if (line && !reportedLines.has(line)) {
                reportedLines.add(line);
                const arrayName = object.type === 'Identifier' ? object.name : 'array';
                issues.push({
                    penalty: PENALTIES.UNCHECKED_ARRAY_ACCESS,
                    comment: `Unchecked array access '${arrayName}[...]' at line ${line}. Verify array exists and has expected length.`,
                });
            }
        },
    });
}

/**
 * Detects usage of external/user input without validation
 */
function checkUncheckedExternalInput(ast, issues) {
    const reportedLines = new Set();

    traverse(ast, {
        MemberExpression(path) {
            const object = path.node.object;
            const property = path.node.property;

            // Check for req.body, req.query, req.params access
            if (
                object.type === 'MemberExpression' &&
                object.object.type === 'Identifier' &&
                object.object.name === 'req' &&
                object.property.type === 'Identifier' &&
                ['body', 'query', 'params'].includes(object.property.name)
            ) {
                // Check if being validated
                if (!isBeingValidated(path)) {
                    const line = path.node.loc?.start.line;
                    if (line && !reportedLines.has(line)) {
                        reportedLines.add(line);
                        const propName = property.type === 'Identifier' ? property.name : 'property';
                        issues.push({
                            penalty: PENALTIES.UNCHECKED_EXTERNAL_INPUT,
                            comment: `Unchecked external input 'req.${object.property.name}.${propName}' at line ${line}. Validate before use.`,
                        });
                    }
                }
            }
        },
    });
}

/**
 * Checks if a path is within a conditional context
 */
function isInCondition(path) {
    let current = path.parentPath;
    while (current) {
        if (
            current.node.type === 'IfStatement' ||
            current.node.type === 'ConditionalExpression' ||
            current.node.type === 'LogicalExpression'
        ) {
            return true;
        }
        current = current.parentPath;
    }
    return false;
}

/**
 * Checks if a node represents null or undefined
 */
function isNullish(node) {
    return (
        node.type === 'NullLiteral' ||
        (node.type === 'Identifier' && node.name === 'undefined')
    );
}

/**
 * Checks if array access is in a safe pattern
 */
function isSafeArrayAccess(path) {
    let current = path.parentPath;
    while (current) {
        // In a for loop
        if (
            current.node.type === 'ForStatement' ||
            current.node.type === 'ForOfStatement' ||
            current.node.type === 'ForInStatement'
        ) {
            return true;
        }
        // After optional chaining
        if (current.node.type === 'OptionalMemberExpression') {
            return true;
        }
        current = current.parentPath;
    }
    return false;
}

/**
 * Checks if input is being validated
 */
function isBeingValidated(path) {
    let current = path.parentPath;
    while (current) {
        // In a conditional check
        if (
            current.node.type === 'IfStatement' &&
            current.node.test === path.node
        ) {
            return true;
        }
        // Type checking
        if (current.node.type === 'UnaryExpression' && current.node.operator === 'typeof') {
            return true;
        }
        current = current.parentPath;
    }
    return false;
}

/**
 * Gets a human-readable function name
 */
function getFunctionName(path) {
    const node = path.node;

    if (node.id && node.id.name) {
        return `'${node.id.name}'`;
    }

    if (path.parent.type === 'VariableDeclarator' && path.parent.id) {
        return `'${path.parent.id.name}'`;
    }

    if (path.parent.type === 'ObjectProperty' && path.parent.key) {
        const key = path.parent.key;
        return `'${key.name || key.value}'`;
    }

    const line = node.loc?.start.line || 'unknown';
    return `anonymous at line ${line}`;
}
