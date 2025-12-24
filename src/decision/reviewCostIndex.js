/**
 * Review Cost Index (RCI) Module
 * 
 * Estimates human review effort using deterministic metrics.
 * RCI helps reviewers prioritize their time effectively.
 */

// RCI weights for each factor (must sum to 1.0)
const RCI_WEIGHTS = {
    nestingDepth: 0.25,          // Cognitive load from deep nesting
    cyclomaticComplexity: 0.30,  // Control flow complexity
    functionLength: 0.20,        // Code size and scannability
    securityDeductions: 0.25,    // Risk assessment overhead
};

// Thresholds for normalizing raw metrics to 0-100 scale
const NORMALIZATION = {
    nestingDepth: {
        min: 0,
        max: 8,      // Depths beyond 8 are equally bad
    },
    cyclomaticComplexity: {
        min: 1,
        max: 25,     // Complexity beyond 25 is extremely high
    },
    functionLength: {
        min: 0,
        max: 100,    // Functions beyond 100 lines are very long
    },
    securityDeductions: {
        min: 0,
        max: 25,     // Full security score lost
    },
};

// RCI level thresholds
const RCI_LEVELS = {
    LOW: { max: 33, label: 'LOW', meaning: 'Readable in one pass' },
    MEDIUM: { max: 66, label: 'MEDIUM', meaning: 'Requires re-reading, moderate effort' },
    HIGH: { max: 100, label: 'HIGH', meaning: 'Likely rejection or heavy commenting required' },
};

/**
 * Calculates the Review Cost Index
 * @param {{
 *   maxNestingDepth: number,
 *   maxCyclomaticComplexity: number,
 *   maxFunctionLength: number,
 *   totalFunctions: number
 * }} metrics - AST metrics
 * @param {number} securityScore - Security category score (0-25)
 * @returns {{
 *   level: string,
 *   score: number,
 *   factors: object,
 *   humanExplanation: string
 * }}
 */
function calculateRCI(metrics, securityScore) {
    // Calculate security deductions (25 - score = deductions)
    const securityDeductions = 25 - securityScore;

    // Normalize each metric to 0-100 scale
    const normalizedMetrics = {
        nestingDepth: normalizeMetric(
            metrics.maxNestingDepth,
            NORMALIZATION.nestingDepth.min,
            NORMALIZATION.nestingDepth.max
        ),
        cyclomaticComplexity: normalizeMetric(
            metrics.maxCyclomaticComplexity,
            NORMALIZATION.cyclomaticComplexity.min,
            NORMALIZATION.cyclomaticComplexity.max
        ),
        functionLength: normalizeMetric(
            metrics.maxFunctionLength,
            NORMALIZATION.functionLength.min,
            NORMALIZATION.functionLength.max
        ),
        securityDeductions: normalizeMetric(
            securityDeductions,
            NORMALIZATION.securityDeductions.min,
            NORMALIZATION.securityDeductions.max
        ),
    };

    // Calculate weighted score
    let totalScore = 0;
    const factors = {};

    for (const [factor, weight] of Object.entries(RCI_WEIGHTS)) {
        const contribution = Math.round(normalizedMetrics[factor] * weight);
        totalScore += contribution;

        factors[factor] = {
            rawValue: getRawValue(factor, metrics, securityDeductions),
            normalized: normalizedMetrics[factor],
            weight: weight,
            contribution: contribution,
        };
    }

    // Clamp score to 0-100
    totalScore = Math.min(100, Math.max(0, totalScore));

    // Determine level
    const level = determineLevel(totalScore);

    // Generate human explanation
    const humanExplanation = generateExplanation(level, factors, totalScore);

    return {
        level: level.label,
        score: totalScore,
        factors,
        humanExplanation,
    };
}

/**
 * Normalizes a metric value to 0-100 scale
 */
function normalizeMetric(value, min, max) {
    if (value <= min) return 0;
    if (value >= max) return 100;
    return Math.round(((value - min) / (max - min)) * 100);
}

/**
 * Gets the raw value for a factor
 */
function getRawValue(factor, metrics, securityDeductions) {
    switch (factor) {
        case 'nestingDepth':
            return metrics.maxNestingDepth;
        case 'cyclomaticComplexity':
            return metrics.maxCyclomaticComplexity;
        case 'functionLength':
            return metrics.maxFunctionLength;
        case 'securityDeductions':
            return securityDeductions;
        default:
            return 0;
    }
}

/**
 * Determines RCI level from score
 */
function determineLevel(score) {
    if (score <= RCI_LEVELS.LOW.max) {
        return RCI_LEVELS.LOW;
    }
    if (score <= RCI_LEVELS.MEDIUM.max) {
        return RCI_LEVELS.MEDIUM;
    }
    return RCI_LEVELS.HIGH;
}

/**
 * Generates human-readable explanation of RCI
 */
function generateExplanation(level, factors, totalScore) {
    // Find top contributing factors
    const sortedFactors = Object.entries(factors)
        .sort((a, b) => b[1].contribution - a[1].contribution);

    const topFactor = sortedFactors[0];
    const topFactorName = formatFactorName(topFactor[0]);

    const explanations = {
        LOW: `This code is straightforward to review (RCI: ${totalScore}). ` +
            `Clear structure and manageable complexity allow single-pass review.`,

        MEDIUM: `This code requires moderate review effort (RCI: ${totalScore}). ` +
            `Main contributor: ${topFactorName}. ` +
            `Reviewer may need to re-read sections for full understanding.`,

        HIGH: `This code demands significant review effort (RCI: ${totalScore}). ` +
            `Primary concern: ${topFactorName} (${topFactor[1].contribution} points). ` +
            `Expect detailed commenting or potential rejection.`,
    };

    return explanations[level.label];
}

/**
 * Formats factor name for human readability
 */
function formatFactorName(factor) {
    const names = {
        nestingDepth: 'deep nesting',
        cyclomaticComplexity: 'high cyclomatic complexity',
        functionLength: 'long functions',
        securityDeductions: 'security concerns',
    };
    return names[factor] || factor;
}

module.exports = {
    calculateRCI,
    RCI_WEIGHTS,
    RCI_LEVELS,
};
