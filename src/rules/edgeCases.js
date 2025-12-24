const traverse = require('@babel/traverse').default;

const MAX_SCORE = 25;

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
function analyzeEdgeCases(ast) {
    const issues = [];

    // Check async functions without try/catch
    checkAsyncWithoutTryCatch(ast, issues);

    // Check array access without guards
    checkUncheckedArrayAccess(ast, issues);

    // Check unchecked external input
    checkUncheckedExternalInput(ast, issues);

    return issues;
}

/**
 * Detects async functions that don't have try/catch
 */
function checkAsyncWithoutTryCatch(ast, issues) {
    traverse(ast, {
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
            const node = path.node;

            // Only check async functions
            if (!node.async) return;

            const body = node.body;
            if (!body || body.type !== 'BlockStatement') return;

            // Check if there's a try statement wrapping the main logic
            const hasTryCatch = body.body.some(stmt => stmt.type === 'TryStatement');

            // Also check if the function has any await expressions
            let hasAwait = false;
            path.traverse({
                AwaitExpression() {
                    hasAwait = true;
                },
                // Don't traverse into nested functions
                'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(nestedPath) {
                    nestedPath.skip();
                },
            });

            if (hasAwait && !hasTryCatch) {
                const funcName = getFunctionName(path);
                issues.push({
                    penalty: PENALTIES.ASYNC_NO_TRY_CATCH,
                    comment: `Async function ${funcName} contains await expressions without try/catch error handling.`,
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
    const reportedAccesses = new Set();

    // First pass: find identifiers that have been checked
    traverse(ast, {
        // arr.length checks
        MemberExpression(path) {
            if (
                path.node.property.type === 'Identifier' &&
                path.node.property.name === 'length' &&
                path.node.object.type === 'Identifier'
            ) {
                // If this is in a condition context, mark as checked
                if (isInCondition(path)) {
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
                path.node.arguments[0]?.type === 'Identifier'
            ) {
                if (isInCondition(path)) {
                    checkedIdentifiers.add(path.node.arguments[0].name);
                }
            }
        },

        // null/undefined checks
        BinaryExpression(path) {
            const { left, operator, right } = path.node;
            if (['===', '!==', '==', '!='].includes(operator)) {
                if (left.type === 'Identifier' && isNullish(right)) {
                    checkedIdentifiers.add(left.name);
                }
                if (right.type === 'Identifier' && isNullish(left)) {
                    checkedIdentifiers.add(right.name);
                }
            }
        },
    });

    // Second pass: find array accesses
    traverse(ast, {
        MemberExpression(path) {
            // arr[index] pattern
            if (path.node.computed && path.node.object.type === 'Identifier') {
                const arrayName = path.node.object.name;
                const line = path.node.loc?.start.line;
                const key = `${arrayName}:${line}`;

                // Skip if already reported or if it's been checked
                if (reportedAccesses.has(key)) return;
                if (checkedIdentifiers.has(arrayName)) return;

                // Skip common patterns that are safe
                if (isSafeArrayAccess(path)) return;

                reportedAccesses.add(key);
                issues.push({
                    penalty: PENALTIES.UNCHECKED_ARRAY_ACCESS,
                    comment: `Array '${arrayName}' accessed at line ${line} without prior length or null check.`,
                });
            }
        },
    });
}

/**
 * Detects usage of external/user input without validation
 */
function checkUncheckedExternalInput(ast, issues) {
    const validatedInputs = new Set();
    const reportedInputs = new Set();

    // Common request object properties that contain user input
    const inputPatterns = ['body', 'params', 'query', 'headers'];

    traverse(ast, {
        MemberExpression(path) {
            const node = path.node;

            // Check for req.body, req.params, etc.
            if (
                node.object.type === 'Identifier' &&
                (node.object.name === 'req' || node.object.name === 'request') &&
                node.property.type === 'Identifier' &&
                inputPatterns.includes(node.property.name)
            ) {
                const inputPath = `${node.object.name}.${node.property.name}`;
                const line = node.loc?.start.line;

                // Check if this is being validated
                if (isBeingValidated(path)) {
                    validatedInputs.add(inputPath);
                    return;
                }

                // Skip if already validated or reported
                if (validatedInputs.has(inputPath)) return;
                const key = `${inputPath}:${line}`;
                if (reportedInputs.has(key)) return;

                reportedInputs.add(key);
                issues.push({
                    penalty: PENALTIES.UNCHECKED_EXTERNAL_INPUT,
                    comment: `External input '${inputPath}' used at line ${line} without apparent validation.`,
                });
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
        const type = current.node.type;
        if (type === 'IfStatement' && current.node.test === path.node) return true;
        if (type === 'ConditionalExpression' && current.node.test === path.node) return true;
        if (type === 'LogicalExpression') return true;
        current = current.parentPath;
    }
    return false;
}

/**
 * Checks if a node represents null or undefined
 */
function isNullish(node) {
    if (node.type === 'NullLiteral') return true;
    if (node.type === 'Identifier' && node.name === 'undefined') return true;
    return false;
}

/**
 * Checks if array access is in a safe pattern
 */
function isSafeArrayAccess(path) {
    // Inside a for loop with the array's length as condition
    let current = path.parentPath;
    while (current) {
        if (current.node.type === 'ForStatement') {
            // Check if the test references .length
            const test = current.node.test;
            if (test && test.type === 'BinaryExpression') {
                const { left, right } = test;
                if (
                    (left.type === 'MemberExpression' && left.property.name === 'length') ||
                    (right.type === 'MemberExpression' && right.property.name === 'length')
                ) {
                    return true;
                }
            }
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
        // Check if in an if condition
        if (current.node.type === 'IfStatement') return true;
        // Check if being passed to a validation function
        if (current.node.type === 'CallExpression') {
            const callee = current.node.callee;
            if (callee.type === 'Identifier' &&
                /^(validate|check|verify|sanitize|parse)/i.test(callee.name)) {
                return true;
            }
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

module.exports = { analyzeEdgeCases, MAX_SCORE };
