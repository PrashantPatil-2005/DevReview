/**
 * Browser-Compatible Score Aggregator
 * 
 * Combines all rule analyzers and produces deterministic scores.
 * Same logic as server version but ESM exports.
 * This module NEVER makes any network requests.
 */

import { parseCode } from './parser.browser.js';
import { analyzeReadability, MAX_SCORE as READABILITY_MAX } from './rules/readability.browser.js';
import { analyzeComplexity, MAX_SCORE as COMPLEXITY_MAX } from './rules/complexity.browser.js';
import { analyzeEdgeCases, MAX_SCORE as EDGE_CASES_MAX } from './rules/edgeCases.browser.js';
import { analyzeSecurity, MAX_SCORE as SECURITY_MAX } from './rules/security.browser.js';

/**
 * Aggregates penalties into a final score for a category
 * @param {number} maxScore - Maximum score for the category
 * @param {{ penalty: number, comment: string }[]} issues - Array of issues found
 * @returns {{ score: number, comments: string[] }}
 */
function aggregateCategory(maxScore, issues) {
    const totalPenalty = issues.reduce((sum, issue) => sum + issue.penalty, 0);
    const score = Math.max(0, maxScore - totalPenalty);
    const comments = issues.map(issue => issue.comment);

    return { score, comments };
}

/**
 * Extracts critical issues from security analysis
 * @param {Array} securityIssues - Security issues with severity
 * @returns {Array} Critical issues only
 */
function extractCriticalIssues(securityIssues) {
    return securityIssues.filter(issue => issue.severity === 'CRITICAL');
}

/**
 * Analyzes JavaScript/TypeScript code and returns category-wise scores
 * @param {string} code - Raw code
 * @param {string} [filename] - Optional filename for context
 * @returns {{ 
 *   readability: { score: number, comments: string[] },
 *   complexity: { score: number, comments: string[] },
 *   edgeCases: { score: number, comments: string[] },
 *   security: { score: number, comments: string[] },
 *   totalScore: number,
 *   criticalIssues: Array,
 *   error?: string
 * }}
 */
export function analyzeCode(code, filename = 'unknown') {
    // Parse the code into AST
    const { ast, error } = parseCode(code);

    if (error) {
        return {
            filename,
            readability: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            complexity: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            edgeCases: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            security: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            totalScore: 0,
            criticalIssues: [],
            error: error,
        };
    }

    // Run all analyzers
    const readabilityIssues = analyzeReadability(ast);
    const complexityIssues = analyzeComplexity(ast);
    const edgeCaseIssues = analyzeEdgeCases(ast);
    const securityIssues = analyzeSecurity(ast);

    // Extract critical issues
    const criticalIssues = extractCriticalIssues(securityIssues);

    // Aggregate scores
    const readability = aggregateCategory(READABILITY_MAX, readabilityIssues);
    const complexity = aggregateCategory(COMPLEXITY_MAX, complexityIssues);
    const edgeCases = aggregateCategory(EDGE_CASES_MAX, edgeCaseIssues);
    const security = aggregateCategory(SECURITY_MAX, securityIssues);

    // Calculate total score
    const totalScore = readability.score + complexity.score + edgeCases.score + security.score;

    return {
        filename,
        readability,
        complexity,
        edgeCases,
        security,
        totalScore,
        criticalIssues,
    };
}

/**
 * Analyzes multiple files and aggregates results
 * @param {Array<{filename: string, content: string}>} files - Files to analyze
 * @returns {{ 
 *   files: Array,
 *   aggregated: object,
 *   criticalIssues: Array
 * }}
 */
export function analyzeFiles(files) {
    const results = files.map(file => analyzeCode(file.content, file.filename));

    // Aggregate scores across all files
    const totalFiles = results.length;
    const aggregated = {
        readability: { score: 0, comments: [] },
        complexity: { score: 0, comments: [] },
        edgeCases: { score: 0, comments: [] },
        security: { score: 0, comments: [] },
        totalScore: 0,
    };

    // Collect all critical issues
    const allCriticalIssues = [];

    for (const result of results) {
        aggregated.readability.score += result.readability.score;
        aggregated.readability.comments.push(...result.readability.comments.map(c => `[${result.filename}] ${c}`));

        aggregated.complexity.score += result.complexity.score;
        aggregated.complexity.comments.push(...result.complexity.comments.map(c => `[${result.filename}] ${c}`));

        aggregated.edgeCases.score += result.edgeCases.score;
        aggregated.edgeCases.comments.push(...result.edgeCases.comments.map(c => `[${result.filename}] ${c}`));

        aggregated.security.score += result.security.score;
        aggregated.security.comments.push(...result.security.comments.map(c => `[${result.filename}] ${c}`));

        // Collect critical issues with filename
        for (const issue of result.criticalIssues) {
            allCriticalIssues.push({
                ...issue,
                filename: result.filename,
            });
        }
    }

    // Average the scores
    if (totalFiles > 0) {
        aggregated.readability.score = Math.round(aggregated.readability.score / totalFiles);
        aggregated.complexity.score = Math.round(aggregated.complexity.score / totalFiles);
        aggregated.edgeCases.score = Math.round(aggregated.edgeCases.score / totalFiles);
        aggregated.security.score = Math.round(aggregated.security.score / totalFiles);
        aggregated.totalScore = aggregated.readability.score +
            aggregated.complexity.score +
            aggregated.edgeCases.score +
            aggregated.security.score;
    }

    return {
        files: results,
        aggregated,
        criticalIssues: allCriticalIssues,
    };
}
