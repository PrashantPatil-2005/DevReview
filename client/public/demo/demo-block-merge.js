/**
 * Demo: BLOCK_MERGE despite high score
 * 
 * This file demonstrates the verdict override mechanism.
 * It has good overall code quality (score ~78) but uses eval(),
 * which triggers a BLOCK_MERGE verdict regardless of score.
 * 
 * Expected Result:
 *   - Score: ~78/100 (good readability, complexity, edge cases)
 *   - Verdict: BLOCK_MERGE
 *   - Override Reason: "Critical security issues detected: eval() usage"
 */

/**
 * Calculates a mathematical expression from a formula string
 * 
 * This function demonstrates good practices in many areas:
 * - Clear function name and documentation
 * - Input validation for parameters
 * - Type checking with descriptive errors
 * - Reasonable function length
 * 
 * BUT it uses eval() which is a critical security vulnerability!
 * 
 * @param {string} formula - Mathematical formula with $0, $1, etc. as placeholders
 * @param {number[]} values - Array of values to substitute
 * @returns {number} Calculated result
 */
function calculateFromFormula(formula, values) {
    // Good: Input validation for formula parameter
    if (typeof formula !== 'string') {
        throw new TypeError('Formula must be a string');
    }

    if (!formula.trim()) {
        throw new Error('Formula cannot be empty');
    }

    // Good: Type checking for values array
    if (!Array.isArray(values)) {
        throw new TypeError('Values must be an array');
    }

    // Good: Validate all values are numbers
    for (let i = 0; i < values.length; i++) {
        if (typeof values[i] !== 'number' || isNaN(values[i])) {
            throw new TypeError(`Value at index ${i} must be a valid number`);
        }
    }

    // Good: Check for placeholder references
    const placeholderPattern = /\$(\d+)/g;
    let match;
    while ((match = placeholderPattern.exec(formula)) !== null) {
        const index = parseInt(match[1], 10);
        if (index >= values.length) {
            throw new RangeError(`Placeholder $${index} exceeds values array length`);
        }
    }

    // CRITICAL SECURITY ISSUE: Using eval()
    // This is what triggers the BLOCK_MERGE verdict!
    // Even though the code is otherwise well-structured,
    // eval() allows arbitrary code execution and must never be used.
    const expression = formula.replace(/\$(\d+)/g, (_, idx) => values[parseInt(idx, 10)]);
    const result = eval(expression);

    // Good: Validate result
    if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Formula did not evaluate to a valid number');
    }

    return result;
}

/**
 * Helper function to validate formula syntax
 * @param {string} formula - Formula to validate
 * @returns {boolean} True if valid
 */
function isValidFormulaSyntax(formula) {
    // Only allow safe characters in formula
    const safePattern = /^[\d\s\+\-\*\/\(\)\.\$]+$/;
    return safePattern.test(formula);
}

/**
 * Batch calculation for multiple value sets
 * @param {string} formula - Base formula
 * @param {number[][]} valueSets - Array of value arrays
 * @returns {number[]} Array of results
 */
function batchCalculate(formula, valueSets) {
    if (!Array.isArray(valueSets)) {
        throw new TypeError('Value sets must be an array');
    }

    const results = [];

    for (const values of valueSets) {
        try {
            const result = calculateFromFormula(formula, values);
            results.push(result);
        } catch (err) {
            results.push(null);
        }
    }

    return results;
}

// Export for analysis
export { calculateFromFormula, isValidFormulaSyntax, batchCalculate };
