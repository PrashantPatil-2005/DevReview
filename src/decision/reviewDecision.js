/**
 * Review Decision Module
 * 
 * Determines whether code is ready for human review based on
 * deterministic scoring rules. All decisions are explainable.
 */

// Decision constants
const DECISIONS = {
    NOT_READY: 'NOT_READY_FOR_REVIEW',
    NEEDS_REFACTOR: 'NEEDS_REFACTOR',
    READY: 'READY_FOR_HUMAN_REVIEW',
};

// Thresholds
const THRESHOLDS = {
    REJECT_TOTAL: 65,
    REJECT_CATEGORY: 10,
    REFACTOR_MAX: 80,
};

// Critical security issues that block "Ready" status
const CRITICAL_SECURITY_PATTERNS = [
    'eval',
    'Function()',
    'child_process',
    'hardcoded secret',
];

/**
 * Determines the review decision based on scores
 * @param {{
 *   readability: { score: number, comments: string[] },
 *   complexity: { score: number, comments: string[] },
 *   edgeCases: { score: number, comments: string[] },
 *   security: { score: number, comments: string[] },
 *   totalScore: number
 * }} scores - Category-wise scores
 * @returns {{
 *   decision: string,
 *   decisionReason: string,
 *   decisionDetails: {
 *     totalScore: number,
 *     categoryScores: object,
 *     failedCategories: string[],
 *     hasCriticalDeductions: boolean
 *   }
 * }}
 */
function determineDecision(scores) {
    const { readability, complexity, edgeCases, security, totalScore } = scores;

    const categoryScores = {
        readability: readability.score,
        complexity: complexity.score,
        edgeCases: edgeCases.score,
        security: security.score,
    };

    // Find categories below threshold
    const failedCategories = [];
    for (const [category, score] of Object.entries(categoryScores)) {
        if (score < THRESHOLDS.REJECT_CATEGORY) {
            failedCategories.push(category);
        }
    }

    // Check for critical security deductions
    const hasCriticalDeductions = checkCriticalDeductions(security.comments);

    const decisionDetails = {
        totalScore,
        categoryScores,
        failedCategories,
        hasCriticalDeductions,
    };

    // Rule 1: Reject if total < 65 OR any category < 10
    if (totalScore < THRESHOLDS.REJECT_TOTAL || failedCategories.length > 0) {
        return {
            decision: DECISIONS.NOT_READY,
            decisionReason: buildRejectReason(totalScore, failedCategories, categoryScores),
            decisionDetails,
        };
    }

    // Rule 2: Needs Refactor if 65 ≤ total ≤ 80
    if (totalScore <= THRESHOLDS.REFACTOR_MAX) {
        return {
            decision: DECISIONS.NEEDS_REFACTOR,
            decisionReason: buildRefactorReason(totalScore),
            decisionDetails,
        };
    }

    // Rule 3: Ready if total > 80 AND no critical deductions
    if (hasCriticalDeductions) {
        return {
            decision: DECISIONS.NEEDS_REFACTOR,
            decisionReason: `Total score ${totalScore} is good, but critical security issues detected. Address security concerns before human review.`,
            decisionDetails,
        };
    }

    return {
        decision: DECISIONS.READY,
        decisionReason: buildReadyReason(totalScore, categoryScores),
        decisionDetails,
    };
}

/**
 * Checks if security comments contain critical issues
 * @param {string[]} comments - Security analyzer comments
 * @returns {boolean}
 */
function checkCriticalDeductions(comments) {
    const lowerComments = comments.map(c => c.toLowerCase());

    for (const pattern of CRITICAL_SECURITY_PATTERNS) {
        for (const comment of lowerComments) {
            if (comment.includes(pattern.toLowerCase())) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Builds rejection reason message
 */
function buildRejectReason(totalScore, failedCategories, categoryScores) {
    const reasons = [];

    if (totalScore < THRESHOLDS.REJECT_TOTAL) {
        reasons.push(`Total score ${totalScore} is below minimum threshold (${THRESHOLDS.REJECT_TOTAL})`);
    }

    if (failedCategories.length > 0) {
        const failedDetails = failedCategories
            .map(cat => `${cat}: ${categoryScores[cat]}`)
            .join(', ');
        reasons.push(`Critical deficiencies in: ${failedDetails} (minimum: ${THRESHOLDS.REJECT_CATEGORY})`);
    }

    return reasons.join('. ') + '. Code requires significant improvements before review.';
}

/**
 * Builds refactor reason message
 */
function buildRefactorReason(totalScore) {
    const gap = THRESHOLDS.REFACTOR_MAX - totalScore;
    return `Total score ${totalScore} indicates code needs refactoring (${gap} points below optimal). ` +
        `Address flagged issues to improve maintainability before human review.`;
}

/**
 * Builds ready reason message
 */
function buildReadyReason(totalScore, categoryScores) {
    const sorted = Object.entries(categoryScores)
        .sort((a, b) => a[1] - b[1]);

    const lowest = sorted[0];

    let message = `Code quality score ${totalScore}/100 meets standards for human review.`;

    if (lowest[1] < 20) {
        message += ` Reviewer should pay attention to ${lowest[0]} (${lowest[1]}/25).`;
    }

    return message;
}

module.exports = {
    determineDecision,
    DECISIONS,
    THRESHOLDS,
};
