/**
 * Verdict Engine for Browser-Only Analysis
 * 
 * Provides PR-style verdicts based on scores and critical issues.
 * Critical security issues ALWAYS override score-based verdicts.
 * 
 * This module NEVER makes any network requests.
 */

// Verdict constants
export const VERDICTS = {
    APPROVE: 'APPROVE',
    APPROVE_WITH_NITS: 'APPROVE_WITH_NITS',
    REQUEST_CHANGES: 'REQUEST_CHANGES',
    BLOCK_MERGE: 'BLOCK_MERGE',
};

// Verdict display configuration
export const VERDICT_CONFIG = {
    [VERDICTS.APPROVE]: {
        label: 'Approve',
        icon: '✅',
        color: '#22c55e',
        description: 'Code quality meets standards. Ready to merge.',
    },
    [VERDICTS.APPROVE_WITH_NITS]: {
        label: 'Approve with Nits',
        icon: '🟡',
        color: '#eab308',
        description: 'Minor issues found. Can proceed but consider addressing.',
    },
    [VERDICTS.REQUEST_CHANGES]: {
        label: 'Request Changes',
        icon: '🟠',
        color: '#f97316',
        description: 'Issues need attention before merging.',
    },
    [VERDICTS.BLOCK_MERGE]: {
        label: 'Block Merge',
        icon: '🛑',
        color: '#ef4444',
        description: 'Critical issues detected. Must be resolved.',
    },
};

// Threshold configuration
const THRESHOLDS = {
    APPROVE_MIN: 85,           // Score >= 85, no critical issues
    APPROVE_WITH_NITS_MIN: 75, // Score 75-84, no critical issues
    REQUEST_CHANGES_MIN: 65,   // Score 65-74
    // Below 65 = BLOCK_MERGE
};

/**
 * Determines the PR-style verdict based on analysis results
 * @param {{
 *   totalScore: number,
 *   criticalIssues: Array,
 *   aggregated?: object
 * }} analysisResult - Result from aggregator
 * @returns {{
 *   verdict: string,
 *   explanation: string,
 *   overrideReason?: string,
 *   details: object
 * }}
 */
export function determineVerdict(analysisResult) {
    const { totalScore, criticalIssues = [], aggregated } = analysisResult;

    const hasCriticalIssues = criticalIssues.length > 0;

    // RULE 1: Critical issues ALWAYS result in BLOCK_MERGE
    // This is the zero-trust security-first approach
    if (hasCriticalIssues) {
        const criticalTypes = [...new Set(criticalIssues.map(issue => {
            // Extract the issue type from the comment
            if (issue.comment.includes('eval')) return 'eval() usage';
            if (issue.comment.includes('Function()')) return 'Function() constructor';
            if (issue.comment.includes('child_process')) return 'child_process usage';
            return 'critical security issue';
        }))];

        return {
            verdict: VERDICTS.BLOCK_MERGE,
            explanation: `Score: ${totalScore}/100 — Verdict: BLOCK_MERGE`,
            overrideReason: `Critical security issues detected: ${criticalTypes.join(', ')}`,
            details: {
                scoreBasedVerdict: getScoreBasedVerdict(totalScore),
                wasOverridden: true,
                criticalIssueCount: criticalIssues.length,
                criticalIssues: criticalIssues.map(i => ({
                    file: i.filename || 'unknown',
                    issue: i.comment,
                })),
            },
        };
    }

    // RULE 2: No critical issues - use score-based verdict
    const verdict = getScoreBasedVerdict(totalScore);

    return {
        verdict,
        explanation: buildExplanation(verdict, totalScore, aggregated),
        details: {
            scoreBasedVerdict: verdict,
            wasOverridden: false,
            thresholds: THRESHOLDS,
        },
    };
}

/**
 * Gets verdict based purely on score (without critical issue override)
 * @param {number} totalScore - Total score 0-100
 * @returns {string} Verdict constant
 */
function getScoreBasedVerdict(totalScore) {
    if (totalScore >= THRESHOLDS.APPROVE_MIN) {
        return VERDICTS.APPROVE;
    }
    if (totalScore >= THRESHOLDS.APPROVE_WITH_NITS_MIN) {
        return VERDICTS.APPROVE_WITH_NITS;
    }
    if (totalScore >= THRESHOLDS.REQUEST_CHANGES_MIN) {
        return VERDICTS.REQUEST_CHANGES;
    }
    return VERDICTS.BLOCK_MERGE;
}

/**
 * Builds human-readable explanation for the verdict
 * @param {string} verdict - Verdict constant
 * @param {number} totalScore - Total score
 * @param {object} [aggregated] - Aggregated category scores
 * @returns {string} Explanation text
 */
function buildExplanation(verdict, totalScore, aggregated) {
    const config = VERDICT_CONFIG[verdict];
    let explanation = `Score: ${totalScore}/100 — Verdict: ${verdict}`;

    switch (verdict) {
        case VERDICTS.APPROVE:
            explanation += `. ${config.description}`;
            break;

        case VERDICTS.APPROVE_WITH_NITS:
            explanation += `. ${config.description}`;
            if (aggregated) {
                const weakest = findWeakestCategory(aggregated);
                if (weakest) {
                    explanation += ` Pay attention to ${weakest.name} (${weakest.score}/25).`;
                }
            }
            break;

        case VERDICTS.REQUEST_CHANGES:
            explanation += `. ${config.description}`;
            if (aggregated) {
                const issues = findSignificantIssues(aggregated);
                if (issues.length > 0) {
                    explanation += ` Focus on: ${issues.join(', ')}.`;
                }
            }
            break;

        case VERDICTS.BLOCK_MERGE:
            explanation += `. Score is below minimum threshold (${THRESHOLDS.REQUEST_CHANGES_MIN}). ${config.description}`;
            break;
    }

    return explanation;
}

/**
 * Finds the weakest scoring category
 * @param {object} aggregated - Aggregated scores
 * @returns {{name: string, score: number}|null}
 */
function findWeakestCategory(aggregated) {
    const categories = [
        { name: 'readability', score: aggregated.readability?.score ?? 25 },
        { name: 'complexity', score: aggregated.complexity?.score ?? 25 },
        { name: 'edgeCases', score: aggregated.edgeCases?.score ?? 25 },
        { name: 'security', score: aggregated.security?.score ?? 25 },
    ];

    return categories.reduce((min, cat) =>
        cat.score < min.score ? cat : min
    );
}

/**
 * Finds categories with significant issues
 * @param {object} aggregated - Aggregated scores
 * @returns {string[]} List of category names with issues
 */
function findSignificantIssues(aggregated) {
    const issues = [];
    const threshold = 15; // Below 15/25 is significant

    if (aggregated.readability?.score < threshold) {
        issues.push('readability');
    }
    if (aggregated.complexity?.score < threshold) {
        issues.push('complexity');
    }
    if (aggregated.edgeCases?.score < threshold) {
        issues.push('edge case handling');
    }
    if (aggregated.security?.score < threshold) {
        issues.push('security');
    }

    return issues;
}

/**
 * Generates a summary suitable for display as a badge
 * @param {string} verdict - Verdict constant
 * @param {number} totalScore - Total score
 * @returns {{text: string, color: string, icon: string}}
 */
export function getVerdictBadge(verdict, totalScore) {
    const config = VERDICT_CONFIG[verdict];
    return {
        text: `${config.icon} ${config.label} (${totalScore}/100)`,
        color: config.color,
        icon: config.icon,
    };
}
