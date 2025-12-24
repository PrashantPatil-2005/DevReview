const express = require('express');
const Review = require('../models/Review');

const router = express.Router();

/**
 * GET /reviews
 * Returns list of all past reviews (summary only)
 * 
 * Response: [{ _id, totalScore, createdAt }]
 */
router.get('/', async (req, res) => {
    try {
        const reviews = await Review.find()
            .select('scores.totalScore createdAt')
            .sort({ createdAt: -1 })
            .lean();

        // Flatten the response
        const result = reviews.map(r => ({
            _id: r._id,
            totalScore: r.scores.totalScore,
            createdAt: r.createdAt,
        }));

        return res.json(result);
    } catch (err) {
        console.error('Error fetching reviews:', err);
        return res.status(500).json({
            error: 'Internal server error while fetching reviews',
        });
    }
});

/**
 * GET /reviews/:id
 * Returns full review with all score breakdowns
 * 
 * Response: { _id, code, scores, createdAt }
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findById(id).lean();

        if (!review) {
            return res.status(404).json({
                error: 'Review not found',
            });
        }

        return res.json(review);
    } catch (err) {
        // Handle invalid ObjectId format
        if (err.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid review ID format',
            });
        }

        console.error('Error fetching review:', err);
        return res.status(500).json({
            error: 'Internal server error while fetching review',
        });
    }
});

module.exports = router;
