const traverse = require('@babel/traverse').default;

const MAX_SCORE = 25;

const PENALTIES = {
    EVAL_USAGE: 8,
    CHILD_PROCESS_EXEC: 6,
    HARDCODED_SECRET: 5,
    UNSANITIZED_INPUT: 4,
};

// Patterns that suggest hardcoded secrets
const SECRET_PATTERNS = [
    /^[A-Za-z0-9]{32,}$/,                    // Long alphanumeric strings
    /^sk_[a-zA-Z0-9]+$/,                     // Stripe-style keys
    /^pk_[a-zA-Z0-9]+$/,                     // Stripe public keys
    /^ghp_[a-zA-Z0-9]+$/,                    // GitHub tokens
    /^xox[baprs]-[a-zA-Z0-9-]+$/,           // Slack tokens
    /^AKIA[A-Z0-9]{16}$/,                    // AWS Access Key ID
    /^AIza[0-9A-Za-z-_]{35}$/,              // Google API keys
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i,      // Bearer tokens
];

// Variable names that suggest secrets
const SECRET_VAR_PATTERNS = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /auth/i,
    /credential/i,
    /private[_-]?key/i,
];

// Dangerous functions
const DANGEROUS_FUNCTIONS = new Set(['eval', 'Function']);
const CHILD_PROCESS_METHODS = new Set(['exec', 'execSync', 'spawn', 'spawnSync', 'fork']);

/**
 * Analyzes security smells from AST
 * @param {object} ast - Babel AST
 * @returns {{ penalty: number, comment: string }[]}
 */
function analyzeSecurity(ast) {
    const issues = [];

    // Check for eval usage
    checkEvalUsage(ast, issues);

    // Check for child_process usage
    checkChildProcessUsage(ast, issues);

    // Check for hardcoded secrets
    checkHardcodedSecrets(ast, issues);

    // Check for unsanitized input in risky contexts
    checkUnsanitizedInput(ast, issues);

    return issues;
}

/**
 * Detects eval() and Function() usage
 */
function checkEvalUsage(ast, issues) {
    traverse(ast, {
        CallExpression(path) {
            const callee = path.node.callee;

            // Direct eval call
            if (callee.type === 'Identifier' && DANGEROUS_FUNCTIONS.has(callee.name)) {
                const line = path.node.loc?.start.line;
                issues.push({
                    penalty: PENALTIES.EVAL_USAGE,
                    comment: `Dangerous '${callee.name}()' usage detected at line ${line}. This can execute arbitrary code and is a major security risk.`,
                });
            }

            // new Function()
            if (path.node.type === 'NewExpression' &&
                callee.type === 'Identifier' &&
                callee.name === 'Function') {
                const line = path.node.loc?.start.line;
                issues.push({
                    penalty: PENALTIES.EVAL_USAGE,
                    comment: `Dangerous 'new Function()' usage detected at line ${line}. This is equivalent to eval() and can execute arbitrary code.`,
                });
            }
        },

        NewExpression(path) {
            const callee = path.node.callee;
            if (callee.type === 'Identifier' && callee.name === 'Function') {
                const line = path.node.loc?.start.line;
                issues.push({
                    penalty: PENALTIES.EVAL_USAGE,
                    comment: `Dangerous 'new Function()' usage detected at line ${line}. This is equivalent to eval() and can execute arbitrary code.`,
                });
            }
        },
    });
}

/**
 * Detects child_process.exec/spawn usage
 */
function checkChildProcessUsage(ast, issues) {
    const reportedLines = new Set();

    traverse(ast, {
        CallExpression(path) {
            const callee = path.node.callee;

            // child_process.exec() style
            if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
                const methodName = callee.property.name;

                if (CHILD_PROCESS_METHODS.has(methodName)) {
                    const line = path.node.loc?.start.line;
                    if (reportedLines.has(line)) return;
                    reportedLines.add(line);

                    issues.push({
                        penalty: PENALTIES.CHILD_PROCESS_EXEC,
                        comment: `Shell command execution via '${methodName}()' at line ${line}. Ensure input is sanitized to prevent command injection.`,
                    });
                }
            }

            // Direct import: const { exec } = require('child_process')
            if (callee.type === 'Identifier' && CHILD_PROCESS_METHODS.has(callee.name)) {
                const line = path.node.loc?.start.line;
                if (reportedLines.has(line)) return;
                reportedLines.add(line);

                issues.push({
                    penalty: PENALTIES.CHILD_PROCESS_EXEC,
                    comment: `Shell command execution via '${callee.name}()' at line ${line}. Ensure input is sanitized to prevent command injection.`,
                });
            }
        },
    });
}

/**
 * Detects hardcoded secrets
 */
function checkHardcodedSecrets(ast, issues) {
    const reportedLines = new Set();

    traverse(ast, {
        VariableDeclarator(path) {
            const { id, init } = path.node;

            // Check if variable name suggests a secret
            if (id.type === 'Identifier' && init) {
                const varName = id.name;
                const matchesSecretPattern = SECRET_VAR_PATTERNS.some(pattern => pattern.test(varName));

                if (matchesSecretPattern) {
                    // Check if value is a string literal (hardcoded)
                    if (init.type === 'StringLiteral' && init.value.length > 5) {
                        const line = path.node.loc?.start.line;
                        if (reportedLines.has(line)) return;
                        reportedLines.add(line);

                        issues.push({
                            penalty: PENALTIES.HARDCODED_SECRET,
                            comment: `Potential hardcoded secret in variable '${varName}' at line ${line}. Use environment variables instead.`,
                        });
                    }
                }
            }
        },

        // Check string literals that look like API keys
        StringLiteral(path) {
            const value = path.node.value;
            const line = path.node.loc?.start.line;

            // Skip short strings
            if (value.length < 20) return;

            // Check against secret patterns
            const isSecret = SECRET_PATTERNS.some(pattern => pattern.test(value));

            if (isSecret) {
                if (reportedLines.has(line)) return;
                reportedLines.add(line);

                issues.push({
                    penalty: PENALTIES.HARDCODED_SECRET,
                    comment: `Potential hardcoded API key or token detected at line ${line}. Use environment variables instead.`,
                });
            }
        },
    });
}

/**
 * Detects unsanitized input in risky contexts
 */
function checkUnsanitizedInput(ast, issues) {
    const reportedLines = new Set();

    traverse(ast, {
        // Check for template literals with user input
        TemplateLiteral(path) {
            path.node.expressions.forEach(expr => {
                if (isUserInput(expr)) {
                    const line = path.node.loc?.start.line;
                    if (reportedLines.has(line)) return;
                    reportedLines.add(line);

                    issues.push({
                        penalty: PENALTIES.UNSANITIZED_INPUT,
                        comment: `User input interpolated in template at line ${line}. Ensure proper sanitization to prevent injection attacks.`,
                    });
                }
            });
        },

        // Check for string concatenation with user input in risky contexts
        BinaryExpression(path) {
            if (path.node.operator === '+') {
                const { left, right } = path.node;

                // Check if one side looks like SQL/HTML and other is user input
                if (isUserInput(left) || isUserInput(right)) {
                    const otherSide = isUserInput(left) ? right : left;

                    if (otherSide.type === 'StringLiteral') {
                        const value = otherSide.value.toLowerCase();

                        // SQL patterns
                        if (/select|insert|update|delete|from|where/i.test(value)) {
                            const line = path.node.loc?.start.line;
                            if (reportedLines.has(line)) return;
                            reportedLines.add(line);

                            issues.push({
                                penalty: PENALTIES.UNSANITIZED_INPUT,
                                comment: `Potential SQL injection: user input concatenated with SQL at line ${line}. Use parameterized queries.`,
                            });
                        }

                        // HTML patterns
                        if (/<[a-z]+/i.test(value)) {
                            const line = path.node.loc?.start.line;
                            if (reportedLines.has(line)) return;
                            reportedLines.add(line);

                            issues.push({
                                penalty: PENALTIES.UNSANITIZED_INPUT,
                                comment: `Potential XSS: user input concatenated with HTML at line ${line}. Sanitize output.`,
                            });
                        }
                    }
                }
            }
        },
    });
}

/**
 * Checks if an expression represents user input
 */
function isUserInput(node) {
    if (!node) return false;

    // req.body.x, req.params.x, etc.
    if (node.type === 'MemberExpression') {
        let current = node;
        while (current.type === 'MemberExpression') {
            const obj = current.object;
            if (obj.type === 'Identifier' && (obj.name === 'req' || obj.name === 'request')) {
                return true;
            }
            if (obj.type === 'MemberExpression') {
                current = obj;
            } else {
                break;
            }
        }
    }

    return false;
}

module.exports = { analyzeSecurity, MAX_SCORE };
