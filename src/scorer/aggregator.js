const { parseCode } = require('../parser/astParser');
const { analyzeReadability, MAX_SCORE: READABILITY_MAX } = require('../rules/readability');
const { analyzeComplexity, MAX_SCORE: COMPLEXITY_MAX } = require('../rules/complexity');
const { analyzeEdgeCases, MAX_SCORE: EDGE_CASES_MAX } = require('../rules/edgeCases');
const { analyzeSecurity, MAX_SCORE: SECURITY_MAX } = require('../rules/security');
const { extractMetrics, determineDecision, calculateRCI } = require('../decision');

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
 * Analyzes JavaScript code and returns category-wise scores
 * @param {string} code - Raw JavaScript code
 * @returns {{ 
 *   readability: { score: number, comments: string[] },
 *   complexity: { score: number, comments: string[] },
 *   edgeCases: { score: number, comments: string[] },
 *   security: { score: number, comments: string[] },
 *   totalScore: number,
 *   error?: string
 * }}
 */
function analyzeCode(code) {
    // Parse the code into AST
    const { ast, error } = parseCode(code);

    if (error) {
        return {
            readability: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            complexity: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            edgeCases: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            security: { score: 0, comments: ['Unable to analyze: code has syntax errors'] },
            totalScore: 0,
            decision: 'NOT_READY_FOR_REVIEW',
            decisionReason: 'Code has syntax errors and cannot be analyzed.',
            reviewCost: {
                level: 'HIGH',
                score: 100,
                factors: {},
                humanExplanation: 'Code cannot be parsed due to syntax errors.',
            },
            error: error,
        };
    }

    // Run all analyzers
    const readabilityIssues = analyzeReadability(ast);
    const complexityIssues = analyzeComplexity(ast);
    const edgeCaseIssues = analyzeEdgeCases(ast);
    const securityIssues = analyzeSecurity(ast);

    // Aggregate scores
    const readability = aggregateCategory(READABILITY_MAX, readabilityIssues);
    const complexity = aggregateCategory(COMPLEXITY_MAX, complexityIssues);
    const edgeCases = aggregateCategory(EDGE_CASES_MAX, edgeCaseIssues);
    const security = aggregateCategory(SECURITY_MAX, securityIssues);

    // Calculate total score
    const totalScore = readability.score + complexity.score + edgeCases.score + security.score;

    // Build scores object for decision module
    const scores = {
        readability,
        complexity,
        edgeCases,
        security,
        totalScore,
    };

    // Extract AST metrics for RCI calculation
    const metrics = extractMetrics(ast);

    // Determine review decision
    const { decision, decisionReason, decisionDetails } = determineDecision(scores);

    // Calculate Review Cost Index
    const reviewCost = calculateRCI(metrics, security.score);

    return {
        readability,
        complexity,
        edgeCases,
        security,
        totalScore,
        decision,
        decisionReason,
        decisionDetails,
        reviewCost,
        metrics,
    };
}

module.exports = { analyzeCode };
