/**
 * GeoHunt API — Main Express Application
 * 
 * This is the entry point for the backend server. It sets up:
 *   - MongoDB connection
 *   - Security headers (helmet) and rate limiting (optional, gracefully skipped if not installed)
 *   - CORS configuration (open in dev, whitelist in production)
 *   - API route mounting for auth, treasures, progress, leaderboard, and admin
 *   - Global error handling
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Optional security packages — these degrade gracefully if not installed
let helmet, rateLimit;
try { helmet = require('helmet'); } catch (e) { console.log('⚠️  helmet not installed — skipping security headers'); }
try { rateLimit = require('express-rate-limit'); } catch (e) { console.log('⚠️  express-rate-limit not installed — skipping rate limiting'); }

// Import route handlers
const authRoutes = require('./routes/auth');
const treasureRoutes = require('./routes/treasures');
const progressRoutes = require('./routes/progress');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');

// Connect to MongoDB
connectDB();

const app = express();

// Apply security headers if helmet is available
if (helmet) {
    app.use(helmet({ contentSecurityPolicy: false }));
}

// Parse JSON request bodies
app.use(express.json());

// Apply rate limiting if express-rate-limit is available
if (rateLimit) {
    // General API limiter — 200 requests per 15 minutes
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT || '200'),
        message: { success: false, error: 'Too many requests, please try again later' }
    });
    app.use('/api/', limiter);

    // Stricter limiter for auth routes — 30 attempts per 15 minutes
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        message: { success: false, error: 'Too many login attempts, please try again later' }
    });
    app.use('/api/auth', authLimiter);
}

// Configure CORS — allow everything in dev, use whitelist in production
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
    app.use(cors({ credentials: true, origin: true }));
} else {
    const corsOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : [];
    app.use(cors({ origin: corsOrigins, credentials: true }));
}

// Mount API route handlers
app.use('/api/auth', authRoutes);
app.use('/api/treasures', treasureRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

/** Quick health check endpoint — useful for deployment monitoring */
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'GeoHunt API is running!' });
});

// Global error handler — must be last middleware
app.use(errorHandler);

// Export the app for serverless use (Netlify Functions)
module.exports = app;

// Only start listening when run directly (not imported by serverless wrapper)
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🗺️  GeoHunt API running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    });
}
