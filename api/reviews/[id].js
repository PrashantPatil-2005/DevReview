/**
 * Vercel Serverless Function: /api/reviews/[id]
 * 
 * Gets a single review by ID from MongoDB.
 */

const mongoose = require('mongoose');
const Review = require('../../src/models/Review');

let isConnected = false;

async function connectDB() {
    if (isConnected) return true;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        return false;
    }

    try {
        await mongoose.connect(uri);
        isConnected = true;
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        return false;
    }
}

module.exports = async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowed: ['GET'],
        });
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            error: 'Review ID is required',
        });
    }

    const connected = await connectDB();
    if (!connected) {
        return res.status(503).json({
            error: 'Database not configured',
        });
    }

    try {
        const review = await Review.findById(id).lean();

        if (!review) {
            return res.status(404).json({
                error: 'Review not found',
            });
        }

        return res.status(200).json(review);
    } catch (err) {
        // Handle invalid ObjectId
        if (err.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid review ID format',
            });
        }

        console.error('Failed to fetch review:', err);
        return res.status(500).json({
            error: 'Failed to fetch review',
        });
    }
};
