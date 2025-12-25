/**
 * Vercel Serverless Function: /api/reviews
 * 
 * Lists past reviews from MongoDB.
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

    const connected = await connectDB();
    if (!connected) {
        return res.status(503).json({
            error: 'Database not configured',
        });
    }

    try {
        // List reviews (most recent first)
        const reviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .select('_id createdAt scores.totalScore')
            .lean();

        // Transform for response
        const result = reviews.map(r => ({
            _id: r._id,
            createdAt: r.createdAt,
            totalScore: r.scores?.totalScore || 0,
        }));

        return res.status(200).json(result);
    } catch (err) {
        console.error('Failed to fetch reviews:', err);
        return res.status(500).json({
            error: 'Failed to fetch reviews',
        });
    }
};
