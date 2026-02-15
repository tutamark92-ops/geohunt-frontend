const UserProgress = require('../models/UserProgress');
const User = require('../models/User');

/**
 * Get the top players leaderboard, ranked by total points.
 * Returns a nicely formatted list with each player's rank, username,
 * points, number of treasures found, level, and badges.
 * @route   GET /api/leaderboard
 * @param   {number} [req.query.limit=10] - How many players to return (default: top 10)
 * @returns {Object} Ranked array of player stats
 */
exports.getLeaderboard = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const leaderboard = await UserProgress.find()
            .sort({ totalPoints: -1 })
            .limit(limit)
            .populate('user', 'username');

        // Format the raw data into a clean, frontend-friendly structure
        const formattedLeaderboard = leaderboard.map((entry, index) => ({
            rank: index + 1,
            username: entry.user?.username || 'Unknown Hunter',
            points: entry.totalPoints,
            treasuresFound: entry.unlockedTreasures.length,
            level: entry.level,
            badges: entry.badges
        }));

        res.status(200).json({
            success: true,
            count: formattedLeaderboard.length,
            data: formattedLeaderboard
        });
    } catch (err) {
        next(err);
    }
};
