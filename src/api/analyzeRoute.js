const express = require('express');
const { analyzeCode } = require('../scorer/aggregator');
const Review = require('../models/Review');

const router = express.Router();

/**
 * POST /analyze
 * Accepts JavaScript code, analyzes it, and saves the result
 * 
 * Request body: { code: string }
 * Response: {
 *   _id: string,
 *   code: string,
 *   scores: {
 *     readability: { score: number, comments: string[] },
 *     complexity: { score: number, comments: string[] },
 *     edgeCases: { score: number, comments: string[] },
 *     security: { score: number, comments: string[] },
 *     totalScore: number
 *   },
 *   createdAt: string,
 *   error?: string
 * }
 */
router.post('/', async (req, res) => {
    const { code } = req.body;

    // Validate input
    if (typeof code !== 'string') {
        return res.status(400).json({
            error: 'Invalid request: "code" field must be a string',
        });
    }

    if (code.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid request: "code" field cannot be empty',
        });
    }

    try {
        // Step 1: Run analysis (Phase 1 logic - unchanged)
        const result = analyzeCode(code);

        // If there was a syntax error, return 422 (Unprocessable Entity)
        if (result.error) {
            return res.status(422).json(result);
        }

        // Step 2: Save to database
        const review = new Review({
            code,
            scores: {
                readability: result.readability,
                complexity: result.complexity,
                edgeCases: result.edgeCases,
                security: result.security,
                totalScore: result.totalScore,
            },
        });

        const savedReview = await review.save();

        // Step 3: Return saved document
        return res.status(201).json(savedReview);
    } catch (err) {
        console.error('Analysis error:', err);
        return res.status(500).json({
            error: 'Internal server error during code analysis',
        });
    }
});

module.exports = router;
