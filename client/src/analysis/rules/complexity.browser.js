/**
 * Browser-Compatible Complexity Analyzer
 * 
 * Same logic as server version but ESM exports.
 * This module NEVER makes any network requests.
 */

import * as _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

export const MAX_SCORE = 25;

/**
 * Calculates cyclomatic complexity penalty based on score
 * @param {number} complexity - Raw complexity value
 * @returns {number} Penalty to apply
 */
function getComplexityPenalty(complexity) {
    if (complexity <= 5) return 0;
    if (complexity <= 10) return 3;
    if (complexity <= 15) return 6;
    if (complexity <= 20) return 10;
    return 15;
}

/**
 * Analyzes cyclomatic complexity from AST
 * @param {object} ast - Babel AST
 * @returns {{ penalty: number, comment: string }[]}
 */
export function analyzeComplexity(ast) {
    const issues = [];
    const functionComplexities = [];

    traverse(ast, {
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
            const complexity = calculateFunctionComplexity(path);
            const funcName = getFunctionName(path);

            functionComplexities.push({
                name: funcName,
                complexity,
                line: path.node.loc?.start.line || 0,
            });

            const penalty = getComplexityPenalty(complexity);
            if (penalty > 0) {
                issues.push({
                    penalty,
                    comment: `Function ${funcName} has cyclomatic complexity of ${complexity}. Consider simplifying control flow.`,
                });
            }
        },
    });

    // If no functions, check global complexity
    if (functionComplexities.length === 0) {
        const globalComplexity = calculateGlobalComplexity(ast);
        const penalty = getComplexityPenalty(globalComplexity);
        if (penalty > 0) {
            issues.push({
                penalty,
                comment: `Global code has cyclomatic complexity of ${globalComplexity}. Consider organizing into functions.`,
            });
        }
    }

    return issues;
}

/**
 * Calculates complexity for a single function
 * @param {object} path - Babel path to function node
 * @returns {number} Complexity value
 */
function calculateFunctionComplexity(path) {
    let complexity = 1; // Base complexity

    path.traverse({
        // Control flow statements
        IfStatement() {
            complexity++;
        },

        // Loops
        ForStatement() {
            complexity++;
        },
        ForInStatement() {
            complexity++;
        },
        ForOfStatement() {
            complexity++;
        },
        WhileStatement() {
            complexity++;
        },
        DoWhileStatement() {
            complexity++;
        },

        // Switch cases (each case adds complexity)
        SwitchCase(casePath) {
            // Don't count default case
            if (casePath.node.test !== null) {
                complexity++;
            }
        },

        // Ternary expressions
        ConditionalExpression() {
            complexity++;
        },

        // Logical operators
        LogicalExpression(logPath) {
            const op = logPath.node.operator;
            if (op === '&&' || op === '||' || op === '??') {
                complexity++;
            }
        },

        // Catch clauses
        CatchClause() {
            complexity++;
        },
    });

    return complexity;
}

/**
 * Calculates complexity for global/module-level code
 * @param {object} ast - Babel AST
 * @returns {number} Complexity value
 */
function calculateGlobalComplexity(ast) {
    let complexity = 1;

    traverse(ast, {
        IfStatement(path) {
            if (isGlobalLevel(path)) complexity++;
        },
        ForStatement(path) {
            if (isGlobalLevel(path)) complexity++;
        },
        ForInStatement(path) {
            if (isGlobalLevel(path)) complexity++;
        },
        ForOfStatement(path) {
            if (isGlobalLevel(path)) complexity++;
        },
        WhileStatement(path) {
            if (isGlobalLevel(path)) complexity++;
        },
        DoWhileStatement(path) {
            if (isGlobalLevel(path)) complexity++;
        },
        SwitchCase(path) {
            if (isGlobalLevel(path) && path.node.test !== null) complexity++;
        },
        ConditionalExpression(path) {
            if (isGlobalLevel(path)) complexity++;
        },
        LogicalExpression(path) {
            const op = path.node.operator;
            if (isGlobalLevel(path) && (op === '&&' || op === '||' || op === '??')) {
                complexity++;
            }
        },
    });

    return complexity;
}

/**
 * Checks if path is at global level (not inside a function)
 */
function isGlobalLevel(path) {
    let current = path.parentPath;
    while (current) {
        const type = current.node.type;
        if (
            type === 'FunctionDeclaration' ||
            type === 'FunctionExpression' ||
            type === 'ArrowFunctionExpression'
        ) {
            return false;
        }
        current = current.parentPath;
    }
    return true;
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
