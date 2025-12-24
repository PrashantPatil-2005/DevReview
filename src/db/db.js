const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/code-reviewer';

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
async function disconnectDB() {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
}

module.exports = { connectDB, disconnectDB };
