/**
 * Browser Analysis Engine
 * 
 * Main entry point for client-side code analysis.
 * Combines aggregator + verdict engine + proof generation.
 * 
 * PRIVACY GUARANTEE: This module NEVER makes any network requests.
 * All analysis runs entirely within the user's browser.
 */

import { analyzeCode, analyzeFiles } from './aggregator.browser.js';
import { determineVerdict, getVerdictBadge, VERDICTS, VERDICT_CONFIG } from './verdictEngine.js';

/**
 * Generates SHA-256 hash of the source code bundle for verification
 * @param {string} content - Combined source content
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
async function generateProofHash(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Performs complete browser-only analysis on a single file
 * @param {string} code - Source code to analyze
 * @param {string} [filename='code.js'] - Optional filename
 * @returns {Promise<object>} Complete analysis result with verdict and proof
 */
export async function analyzeSingleFile(code, filename = 'code.js') {
    const startTime = performance.now();

    // Run analysis
    const result = analyzeCode(code, filename);

    // Determine verdict
    const verdictResult = determineVerdict({
        totalScore: result.totalScore,
        criticalIssues: result.criticalIssues,
        aggregated: result,
    });

    // Generate proof hash
    const proofHash = await generateProofHash(code);

    const endTime = performance.now();

    return {
        // Analysis results
        ...result,

        // Verdict
        verdict: verdictResult.verdict,
        verdictExplanation: verdictResult.explanation,
        verdictOverrideReason: verdictResult.overrideReason,
        verdictDetails: verdictResult.details,
        verdictBadge: getVerdictBadge(verdictResult.verdict, result.totalScore),

        // Proof
        proofHash,

        // Metadata
        analyzedAt: new Date().toISOString(),
        analysisTimeMs: Math.round(endTime - startTime),
        mode: 'browser-only',

        // Privacy assertion
        privacyAssertion: {
            codeUploaded: false,
            storedToDatabase: false,
            sentToBackend: false,
            analyticsCollected: false,
        },
    };
}

/**
 * Performs complete browser-only analysis on multiple files
 * @param {Array<{filename: string, content: string}>} files - Files to analyze
 * @returns {Promise<object>} Complete analysis result with verdict and proof
 */
export async function analyzeMultipleFiles(files) {
    const startTime = performance.now();

    // Run analysis on all files
    const result = analyzeFiles(files);

    // Determine verdict based on aggregated scores
    const verdictResult = determineVerdict({
        totalScore: result.aggregated.totalScore,
        criticalIssues: result.criticalIssues,
        aggregated: result.aggregated,
    });

    // Generate proof hash from combined content
    const combinedContent = files
        .map(f => `// ${f.filename}\n${f.content}`)
        .join('\n\n');
    const proofHash = await generateProofHash(combinedContent);

    const endTime = performance.now();

    return {
        // Per-file results
        files: result.files,

        // Aggregated scores
        aggregated: result.aggregated,
        totalScore: result.aggregated.totalScore,

        // Critical issues
        criticalIssues: result.criticalIssues,

        // Verdict
        verdict: verdictResult.verdict,
        verdictExplanation: verdictResult.explanation,
        verdictOverrideReason: verdictResult.overrideReason,
        verdictDetails: verdictResult.details,
        verdictBadge: getVerdictBadge(verdictResult.verdict, result.aggregated.totalScore),

        // Proof
        proofHash,

        // Metadata
        analyzedAt: new Date().toISOString(),
        analysisTimeMs: Math.round(endTime - startTime),
        fileCount: files.length,
        mode: 'browser-only',

        // Privacy assertion
        privacyAssertion: {
            codeUploaded: false,
            storedToDatabase: false,
            sentToBackend: false,
            analyticsCollected: false,
        },
    };
}

// Re-export for convenience
export { VERDICTS, VERDICT_CONFIG };
