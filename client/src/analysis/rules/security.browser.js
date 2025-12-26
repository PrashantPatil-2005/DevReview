/**
 * Browser-Compatible Security Analyzer
 * 
 * Same logic as server version but ESM exports.
 * This module NEVER makes any network requests.
 */

import * as _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

export const MAX_SCORE = 25;

const PENALTIES = {
    EVAL_USAGE: 8,
    CHILD_PROCESS_EXEC: 6,
    HARDCODED_SECRET: 5,
    UNSANITIZED_INPUT: 4,
};

// Patterns that suggest hardcoded secrets
const SECRET_PATTERNS = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /passwd/i,
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
 * @returns {{ penalty: number, comment: string, severity?: string }[]}
 */
export function analyzeSecurity(ast) {
    const issues = [];

    checkEvalUsage(ast, issues);
    checkChildProcessUsage(ast, issues);
    checkHardcodedSecrets(ast, issues);
    checkUnsanitizedInput(ast, issues);

    return issues;
}

/**
 * Detects eval() and Function() usage
 */
function checkEvalUsage(ast, issues) {
    const reportedLines = new Set();

    traverse(ast, {
        CallExpression(path) {
            const callee = path.node.callee;

            // Check for direct eval() call
            if (callee.type === 'Identifier' && DANGEROUS_FUNCTIONS.has(callee.name)) {
                const line = path.node.loc?.start.line;
                if (line && !reportedLines.has(line)) {
                    reportedLines.add(line);
                    issues.push({
                        penalty: PENALTIES.EVAL_USAGE,
                        comment: `CRITICAL: ${callee.name}() usage detected at line ${line}. This allows arbitrary code execution and is a major security risk.`,
                        severity: 'CRITICAL',
                    });
                }
            }

            // Check for window.eval or global.eval
            if (
                callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                DANGEROUS_FUNCTIONS.has(callee.property.name)
            ) {
                const line = path.node.loc?.start.line;
                if (line && !reportedLines.has(line)) {
                    reportedLines.add(line);
                    issues.push({
                        penalty: PENALTIES.EVAL_USAGE,
                        comment: `CRITICAL: ${callee.property.name}() usage detected at line ${line}. This allows arbitrary code execution.`,
                        severity: 'CRITICAL',
                    });
                }
            }
        },

        NewExpression(path) {
            const callee = path.node.callee;
            if (callee.type === 'Identifier' && callee.name === 'Function') {
                const line = path.node.loc?.start.line;
                if (line && !reportedLines.has(line)) {
                    reportedLines.add(line);
                    issues.push({
                        penalty: PENALTIES.EVAL_USAGE,
                        comment: `CRITICAL: new Function() usage detected at line ${line}. This is equivalent to eval() and allows arbitrary code execution.`,
                        severity: 'CRITICAL',
                    });
                }
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

            if (callee.type === 'MemberExpression') {
                const property = callee.property;
                if (
                    property.type === 'Identifier' &&
                    CHILD_PROCESS_METHODS.has(property.name)
                ) {
                    // Check if it's likely child_process
                    const object = callee.object;
                    const isChildProcess =
                        (object.type === 'Identifier' && object.name === 'child_process') ||
                        (object.type === 'Identifier' && object.name === 'cp') ||
                        (object.type === 'CallExpression' &&
                            object.callee.type === 'Identifier' &&
                            object.callee.name === 'require');

                    if (isChildProcess) {
                        const line = path.node.loc?.start.line;
                        if (line && !reportedLines.has(line)) {
                            reportedLines.add(line);
                            issues.push({
                                penalty: PENALTIES.CHILD_PROCESS_EXEC,
                                comment: `CRITICAL: child_process.${property.name}() detected at line ${line}. Command injection risk if input is not sanitized.`,
                                severity: 'CRITICAL',
                            });
                        }
                    }
                }
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
            const id = path.node.id;
            const init = path.node.init;

            if (id.type === 'Identifier' && init?.type === 'StringLiteral') {
                const varName = id.name;
                const value = init.value;

                // Check if variable name suggests a secret
                for (const pattern of SECRET_PATTERNS) {
                    if (pattern.test(varName) && value.length >= 8) {
                        const line = path.node.loc?.start.line;
                        if (line && !reportedLines.has(line)) {
                            reportedLines.add(line);
                            issues.push({
                                penalty: PENALTIES.HARDCODED_SECRET,
                                comment: `Potential hardcoded secret in '${varName}' at line ${line}. Use environment variables instead.`,
                                severity: 'HIGH',
                            });
                        }
                        break;
                    }
                }
            }
        },

        // Check string literals that look like API keys
        StringLiteral(path) {
            const value = path.node.value;

            // Pattern for common API key formats (long alphanumeric strings)
            const looksLikeApiKey =
                /^[a-zA-Z0-9_-]{32,}$/.test(value) ||
                /^(sk|pk|api|key)[-_][a-zA-Z0-9]{16,}$/i.test(value);

            if (looksLikeApiKey) {
                const line = path.node.loc?.start.line;
                if (line && !reportedLines.has(line)) {
                    reportedLines.add(line);
                    issues.push({
                        penalty: PENALTIES.HARDCODED_SECRET,
                        comment: `Potential hardcoded API key detected at line ${line}. String pattern matches common key formats.`,
                        severity: 'HIGH',
                    });
                }
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
            if (path.node.expressions.length > 0) {
                for (const expr of path.node.expressions) {
                    if (isUserInput(expr)) {
                        const line = path.node.loc?.start.line;
                        if (line && !reportedLines.has(line)) {
                            reportedLines.add(line);
                            issues.push({
                                penalty: PENALTIES.UNSANITIZED_INPUT,
                                comment: `Potential unsanitized user input in template literal at line ${line}. Validate and sanitize before use.`,
                                severity: 'MEDIUM',
                            });
                        }
                    }
                }
            }
        },

        // Check for string concatenation with user input in risky contexts
        BinaryExpression(path) {
            if (path.node.operator !== '+') return;

            const hasUserInput = isUserInput(path.node.left) || isUserInput(path.node.right);
            if (!hasUserInput) return;

            // Check if used in risky context (innerHTML, SQL, etc.)
            let parent = path.parentPath;
            let riskyContext = false;
            let contextName = '';

            while (parent) {
                if (parent.node.type === 'AssignmentExpression') {
                    const left = parent.node.left;
                    if (left.type === 'MemberExpression') {
                        const prop = left.property;
                        if (prop.type === 'Identifier') {
                            if (['innerHTML', 'outerHTML', 'textContent'].includes(prop.name)) {
                                riskyContext = true;
                                contextName = prop.name;
                            }
                        }
                    }
                }
                parent = parent.parentPath;
            }

            if (riskyContext) {
                const line = path.node.loc?.start.line;
                if (line && !reportedLines.has(line)) {
                    reportedLines.add(line);
                    issues.push({
                        penalty: PENALTIES.UNSANITIZED_INPUT,
                        comment: `User input concatenated into ${contextName} at line ${line}. XSS vulnerability risk.`,
                        severity: 'HIGH',
                    });
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

    if (node.type === 'MemberExpression') {
        const object = node.object;
        const property = node.property;

        // Check for common user input patterns
        if (property.type === 'Identifier') {
            const propName = property.name;
            const userInputProps = ['value', 'data', 'body', 'query', 'params', 'input'];
            if (userInputProps.includes(propName)) return true;
        }

        // Check for req.body, req.query, req.params
        if (object.type === 'Identifier' && object.name === 'req') {
            return true;
        }
    }

    return false;
}
