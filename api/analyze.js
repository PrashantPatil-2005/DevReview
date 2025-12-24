/**
 * Vercel Serverless Function: /api/analyze
 * 
 * Exposes the static code analysis engine as a serverless endpoint.
 * Optionally saves reviews to MongoDB if MONGODB_URI is configured.
 */

const mongoose = require('mongoose');
const { analyze } = require('../src/engine');
const Review = require('../src/models/Review');

// MongoDB connection state for serverless
let isConnected = false;

/**
 * Connect to MongoDB (reuses connection in warm lambdas)
 */
async function connectDB() {
    if (isConnected) return;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log('MONGODB_URI not set, skipping database');
        return;
    }

    try {
        await mongoose.connect(uri);
        isConnected = true;
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        // Don't throw - allow analysis to continue without DB
    }
}

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowed: ['POST'],
        });
    }

    // Extract code from request body
    const { code } = req.body || {};

    try {
        // Run analysis using existing engine
        const result = analyze(code);

        // Check for syntax errors in the result
        if (result.error) {
            return res.status(422).json(result);
        }

        // Try to save to MongoDB if configured
        let savedReview = null;
        await connectDB();

        if (isConnected) {
            try {
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
                savedReview = await review.save();
            } catch (dbError) {
                console.error('Failed to save review:', dbError.message);
                // Continue without saving
            }
        }

        // Return result with optional review ID
        return res.status(200).json({
            ...result,
            _id: savedReview?._id || null,
            savedToDatabase: !!savedReview,
        });
    } catch (err) {
        // Handle validation errors
        if (err.message.startsWith('Invalid input')) {
            return res.status(400).json({
                error: err.message,
            });
        }

        // Handle unexpected errors
        console.error('Analysis error:', err);
        return res.status(500).json({
            error: 'Internal server error during code analysis',
        });
    }
};
