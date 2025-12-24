/**
 * Core Engine Wrapper
 * 
 * This module exposes the existing analysis logic without modification.
 * It wraps the aggregator for use by both Express (local) and Vercel (production).
 */

const { analyzeCode } = require('./scorer/aggregator');

/**
 * Analyzes JavaScript code and returns deterministic review results
 * @param {string} code - Raw JavaScript code to analyze
 * @returns {object} Analysis result with scores, decision, and review cost
 * @throws {Error} If code is not a string or is empty
 */
function analyze(code) {
    // Input validation
    if (typeof code !== 'string') {
        throw new Error('Invalid input: "code" must be a string');
    }

    if (code.trim().length === 0) {
        throw new Error('Invalid input: "code" cannot be empty');
    }

    // Call existing aggregator (no logic changes)
    return analyzeCode(code);
}

module.exports = { analyze };
