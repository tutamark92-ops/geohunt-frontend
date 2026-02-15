const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const Counter = require('../models/Counter');

/**
 * Register a brand-new player.
 * Creates a unique Player ID from their username + an auto-incrementing number
 * (e.g., "aaron42"), sets up their empty progress record, and hands back a JWT token.
 * @route   POST /api/auth/register
 * @param   {string} req.body.username - The display name the player wants to use
 * @returns {Object} JWT token and the new player's info including their unique Player ID
 */
exports.register = async (req, res, next) => {
    try {
        const { username } = req.body;

        if (!username || username.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a username'
            });
        }

        // Generate a unique player ID like "aaron42" using an atomic counter
        const playerNumber = await Counter.getNextValue('playerCount');
        const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const playerId = `${cleanUsername}${playerNumber}`;

        const user = await User.create({
            username: username.trim(),
            playerId,
            playerNumber
        });

        // Every new player starts with a blank slate
        await UserProgress.create({
            user: user._id,
            unlockedTreasures: [],
            totalPoints: 0,
            badges: [],
            level: 1
        });

        const token = user.getSignedJwtToken();

        res.status(201).json({
            success: true,
            token,
            isNewUser: true,
            data: {
                id: user._id,
                username: user.username,
                playerId: user.playerId,
                playerNumber: user.playerNumber
            },
            message: `Welcome ${username}! Your unique Player ID is ${playerId}. Remember this to log back in!`
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Log in an existing user.
 * Supports two login flows:
 *   1. Admin login via email + password (for the admin dashboard)
 *   2. Player login via their unique Player ID (the simple, student-friendly way)
 * @route   POST /api/auth/login
 * @param   {string} [req.body.email]    - Admin email address
 * @param   {string} [req.body.password] - Admin password
 * @param   {string} [req.body.playerId] - Player's unique ID (e.g., "aaron42")
 * @returns {Object} JWT token and user profile data
 */
exports.login = async (req, res, next) => {
    try {
        const { playerId, email, password } = req.body;

        // Path 1: Admin login with email + password
        if (email && password) {
            const user = await User.findOne({ email }).select('+password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            const token = user.getSignedJwtToken();
            return res.status(200).json({
                success: true,
                token,
                data: {
                    id: user._id,
                    username: user.username,
                    playerId: user.playerId,
                    email: user.email
                }
            });
        }

        // Path 2: Player login with their unique Player ID
        if (!playerId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide your Player ID'
            });
        }

        const user = await User.findOne({ playerId: playerId.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: `Player ID "${playerId}" not found. Check your ID or register as a new player.`
            });
        }

        const token = user.getSignedJwtToken();
        res.status(200).json({
            success: true,
            token,
            data: {
                id: user._id,
                username: user.username,
                playerId: user.playerId,
                playerNumber: user.playerNumber
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get the currently logged-in user's profile and game progress.
 * This is called on app load to restore the session from the stored JWT.
 * @route   GET /api/auth/me
 * @access  Protected (requires valid JWT)
 * @returns {Object} User profile and their full progress with unlocked treasures populated
 */
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const progress = await UserProgress.findOne({ user: req.user.id })
            .populate('unlockedTreasures');

        res.status(200).json({
            success: true,
            data: { user, progress }
        });
    } catch (err) {
        next(err);
    }
};
