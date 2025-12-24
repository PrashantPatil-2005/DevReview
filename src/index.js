const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db/db');
const analyzeRoute = require('./api/analyzeRoute');
const reviewsRoute = require('./api/reviewsRoute');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/analyze', analyzeRoute);
app.use('/reviews', reviewsRoute);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server with database connection
async function startServer() {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Static Code Review Engine running on port ${PORT}`);
        console.log(`POST /analyze     - Analyze JavaScript code`);
        console.log(`GET  /reviews     - List past reviews`);
        console.log(`GET  /reviews/:id - Get review details`);
        console.log(`GET  /health      - Health check`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

module.exports = app;
