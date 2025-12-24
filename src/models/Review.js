const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
    },
    scores: {
        readability: {
            score: { type: Number, required: true },
            comments: [String],
        },
        complexity: {
            score: { type: Number, required: true },
            comments: [String],
        },
        edgeCases: {
            score: { type: Number, required: true },
            comments: [String],
        },
        security: {
            score: { type: Number, required: true },
            comments: [String],
        },
        totalScore: { type: Number, required: true },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for listing reviews by date
reviewSchema.index({ createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
