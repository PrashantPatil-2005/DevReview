const traverse = require('@babel/traverse').default;

const MAX_SCORE = 25;

// Penalty configuration
const PENALTIES = {
    LONG_FUNCTION: 3,        // >40 lines
    DEEP_NESTING: 3,         // >4 levels
    POOR_NAMING: 2,          // 1-2 char identifiers
    TOO_MANY_STATEMENTS: 2,  // >5 statements per function
};

const THRESHOLDS = {
    MAX_FUNCTION_LINES: 40,
    MAX_NESTING_DEPTH: 4,
    MIN_IDENTIFIER_LENGTH: 3,
    MAX_STATEMENTS_PER_FUNCTION: 5,
};

// Common short identifiers that are acceptable
const ALLOWED_SHORT_NAMES = new Set([
    'i', 'j', 'k', 'n', 'x', 'y', 'z', // loop/math variables
    'id', 'fn', 'cb', 'db', 'fs', 'os', // common abbreviations
    'e', 'ex', 'err', // error handlers
    '_', '__', // intentionally ignored
]);

/**
 * Analyzes code readability from AST
 * @param {object} ast - Babel AST
 * @returns {{ penalty: number, comment: string }[]}
 */
function analyzeReadability(ast) {
    const issues = [];

    traverse(ast, {
        // Check function length
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
            const node = path.node;
            const loc = node.loc;

            if (loc) {
                const lines = loc.end.line - loc.start.line + 1;
                if (lines > THRESHOLDS.MAX_FUNCTION_LINES) {
                    const funcName = getFunctionName(path);
                    issues.push({
                        penalty: PENALTIES.LONG_FUNCTION,
                        comment: `Function ${funcName} is ${lines} lines long (max: ${THRESHOLDS.MAX_FUNCTION_LINES}). Consider breaking it into smaller functions.`,
                    });
                }
            }

            // Check statement count in function body
            const body = node.body;
            if (body && body.type === 'BlockStatement') {
                const statementCount = body.body.length;
                if (statementCount > THRESHOLDS.MAX_STATEMENTS_PER_FUNCTION) {
                    const funcName = getFunctionName(path);
                    issues.push({
                        penalty: PENALTIES.TOO_MANY_STATEMENTS,
                        comment: `Function ${funcName} has ${statementCount} top-level statements (max: ${THRESHOLDS.MAX_STATEMENTS_PER_FUNCTION}). This may indicate too many responsibilities.`,
                    });
                }
            }
        },

        // Check variable naming
        Identifier(path) {
            const name = path.node.name;

            // Skip if it's a property access or object key
            if (path.parent.type === 'MemberExpression' && path.parent.property === path.node) {
                return;
            }
            if (path.parent.type === 'ObjectProperty' && path.parent.key === path.node && !path.parent.computed) {
                return;
            }

            // Only check variable declarations, function params, and function names
            const isDeclaration =
                path.parent.type === 'VariableDeclarator' ||
                path.parent.type === 'FunctionDeclaration' ||
                path.parent.type === 'FunctionExpression' ||
                path.parent.type === 'ArrowFunctionExpression' ||
                path.listKey === 'params';

            if (isDeclaration && name.length < THRESHOLDS.MIN_IDENTIFIER_LENGTH) {
                if (!ALLOWED_SHORT_NAMES.has(name)) {
                    issues.push({
                        penalty: PENALTIES.POOR_NAMING,
                        comment: `Variable '${name}' has a non-descriptive name (${name.length} chars). Use meaningful names.`,
                    });
                }
            }
        },
    });

    // Check nesting depth
    checkNestingDepth(ast, issues);

    return issues;
}

/**
 * Checks for deep nesting in the code
 */
function checkNestingDepth(ast, issues) {
    const reportedLines = new Set();

    traverse(ast, {
        BlockStatement(path) {
            let depth = 0;
            let current = path;

            while (current) {
                if (isNestingNode(current.parent)) {
                    depth++;
                }
                current = current.parentPath;
            }

            if (depth > THRESHOLDS.MAX_NESTING_DEPTH) {
                const line = path.node.loc?.start.line;
                if (line && !reportedLines.has(line)) {
                    reportedLines.add(line);
                    issues.push({
                        penalty: PENALTIES.DEEP_NESTING,
                        comment: `Deep nesting detected at line ${line} (depth: ${depth}, max: ${THRESHOLDS.MAX_NESTING_DEPTH}). Consider extracting logic or using early returns.`,
                    });
                }
            }
        },
    });
}

/**
 * Determines if a node type contributes to nesting
 */
function isNestingNode(node) {
    if (!node) return false;
    const type = node.type;
    return [
        'IfStatement',
        'ForStatement',
        'ForInStatement',
        'ForOfStatement',
        'WhileStatement',
        'DoWhileStatement',
        'SwitchStatement',
        'TryStatement',
        'CatchClause',
    ].includes(type);
}

/**
 * Gets a human-readable function name
 */
function getFunctionName(path) {
    const node = path.node;

    if (node.id && node.id.name) {
        return `'${node.id.name}'`;
    }

    // Check if assigned to a variable
    if (path.parent.type === 'VariableDeclarator' && path.parent.id) {
        return `'${path.parent.id.name}'`;
    }

    // Check if it's an object method
    if (path.parent.type === 'ObjectProperty' && path.parent.key) {
        const key = path.parent.key;
        return `'${key.name || key.value}'`;
    }

    const line = node.loc?.start.line || 'unknown';
    return `anonymous at line ${line}`;
}

module.exports = { analyzeReadability, MAX_SCORE };
