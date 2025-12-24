const traverse = require('@babel/traverse').default;

/**
 * Extracts deterministic AST metrics for Review Cost Index calculation
 * @param {object} ast - Babel AST
 * @returns {{
 *   maxNestingDepth: number,
 *   maxCyclomaticComplexity: number,
 *   maxFunctionLength: number,
 *   totalFunctions: number
 * }}
 */
function extractMetrics(ast) {
    let maxNestingDepth = 0;
    let maxCyclomaticComplexity = 0;
    let maxFunctionLength = 0;
    let totalFunctions = 0;

    traverse(ast, {
        // Calculate nesting depth for all block statements
        BlockStatement(path) {
            const depth = calculateNestingDepth(path);
            if (depth > maxNestingDepth) {
                maxNestingDepth = depth;
            }
        },

        // Calculate complexity and length for each function
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
            totalFunctions++;

            // Function length
            const loc = path.node.loc;
            if (loc) {
                const lines = loc.end.line - loc.start.line + 1;
                if (lines > maxFunctionLength) {
                    maxFunctionLength = lines;
                }
            }

            // Cyclomatic complexity
            const complexity = calculateFunctionComplexity(path);
            if (complexity > maxCyclomaticComplexity) {
                maxCyclomaticComplexity = complexity;
            }
        },
    });

    // If no functions, calculate global complexity
    if (totalFunctions === 0) {
        maxCyclomaticComplexity = calculateGlobalComplexity(ast);
    }

    return {
        maxNestingDepth,
        maxCyclomaticComplexity,
        maxFunctionLength,
        totalFunctions,
    };
}

/**
 * Calculates nesting depth for a block statement
 * @param {object} path - Babel path
 * @returns {number}
 */
function calculateNestingDepth(path) {
    let depth = 0;
    let current = path;

    while (current) {
        if (isNestingNode(current.parent)) {
            depth++;
        }
        current = current.parentPath;
    }

    return depth;
}

/**
 * Determines if a node type contributes to nesting
 * @param {object} node - AST node
 * @returns {boolean}
 */
function isNestingNode(node) {
    if (!node) return false;
    const nestingTypes = [
        'IfStatement',
        'ForStatement',
        'ForInStatement',
        'ForOfStatement',
        'WhileStatement',
        'DoWhileStatement',
        'SwitchStatement',
        'TryStatement',
        'CatchClause',
    ];
    return nestingTypes.includes(node.type);
}

/**
 * Calculates cyclomatic complexity for a single function
 * @param {object} path - Babel path to function node
 * @returns {number}
 */
function calculateFunctionComplexity(path) {
    let complexity = 1; // Base complexity

    path.traverse({
        IfStatement() { complexity++; },
        ForStatement() { complexity++; },
        ForInStatement() { complexity++; },
        ForOfStatement() { complexity++; },
        WhileStatement() { complexity++; },
        DoWhileStatement() { complexity++; },
        SwitchCase(casePath) {
            if (casePath.node.test !== null) {
                complexity++;
            }
        },
        ConditionalExpression() { complexity++; },
        LogicalExpression(logPath) {
            const op = logPath.node.operator;
            if (op === '&&' || op === '||' || op === '??') {
                complexity++;
            }
        },
        CatchClause() { complexity++; },
    });

    return complexity;
}

/**
 * Calculates complexity for global/module-level code
 * @param {object} ast - Babel AST
 * @returns {number}
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
 * @param {object} path - Babel path
 * @returns {boolean}
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

module.exports = { extractMetrics };
