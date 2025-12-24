/**
 * Decision Module Index
 * 
 * Exports all decision-related functions for the code review system.
 */

const { extractMetrics } = require('./astMetrics');
const { determineDecision, DECISIONS, THRESHOLDS } = require('./reviewDecision');
const { calculateRCI, RCI_WEIGHTS, RCI_LEVELS } = require('./reviewCostIndex');

module.exports = {
    // Metrics extraction
    extractMetrics,

    // Review decision
    determineDecision,
    DECISIONS,
    THRESHOLDS,

    // Review Cost Index
    calculateRCI,
    RCI_WEIGHTS,
    RCI_LEVELS,
};
