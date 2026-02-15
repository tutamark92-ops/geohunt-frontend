const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const Treasure = require('../models/Treasure');

/**
 * Fetch all registered users.
 * We strip out the password field for security — no one needs to see that.
 * @route   GET /api/admin/users
 * @access  Admin only
 */
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Look up a single user by their ID along with their game progress.
 * Useful for the admin dashboard when you want to see how a specific player is doing.
 * @route   GET /api/admin/users/:id
 * @param   {string} req.params.id - The user's MongoDB ObjectId
 * @access  Admin only
 */
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const progress = await UserProgress.findOne({ user: req.params.id })
            .populate('unlockedTreasures');

        res.status(200).json({
            success: true,
            data: { user, progress }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Promote or demote a user by changing their role.
 * Only allows 'user' or 'admin' — anything else gets rejected.
 * @route   PUT /api/admin/users/:id/role
 * @param   {string} req.params.id - The user's MongoDB ObjectId
 * @param   {string} req.body.role - The new role to assign ('user' or 'admin')
 * @access  Admin only
 */
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role. Must be user or admin'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Permanently delete a user and their progress from the system.
 * Has a safety check to prevent admins from accidentally deleting themselves.
 * @route   DELETE /api/admin/users/:id
 * @param   {string} req.params.id - The user's MongoDB ObjectId
 * @access  Admin only
 */
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Don't let an admin shoot themselves in the foot
        if (req.params.id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete yourself'
            });
        }

        await UserProgress.deleteOne({ user: req.params.id });
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Pull together a comprehensive dashboard overview for the admin.
 * Aggregates user counts, treasure stats, unlock activity, top players,
 * and recently joined users — basically everything at a glance.
 * @route   GET /api/admin/stats
 * @access  Admin only
 */
exports.getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalTreasures = await Treasure.countDocuments();

        // Aggregate total unlocks, points earned, and average player level
        const progressData = await UserProgress.aggregate([
            {
                $group: {
                    _id: null,
                    totalUnlocks: { $sum: { $size: '$unlockedTreasures' } },
                    totalPoints: { $sum: '$totalPoints' },
                    avgLevel: { $avg: '$level' }
                }
            }
        ]);

        // Top 5 players by total points for the leaderboard widget
        const topHunters = await UserProgress.find()
            .sort({ totalPoints: -1 })
            .limit(5)
            .populate('user', 'username');

        // Breakdown of how many treasures exist in each category
        const treasuresByCategory = await Treasure.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalPoints: { $sum: '$points' }
                }
            }
        ]);

        // The 5 most recently registered users
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('username email createdAt role');

        res.status(200).json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    admins: totalAdmins,
                    regular: totalUsers - totalAdmins
                },
                treasures: {
                    total: totalTreasures,
                    byCategory: treasuresByCategory
                },
                activity: {
                    totalUnlocks: progressData[0]?.totalUnlocks || 0,
                    totalPointsEarned: progressData[0]?.totalPoints || 0,
                    averageLevel: Math.round((progressData[0]?.avgLevel || 1) * 10) / 10
                },
                topHunters: topHunters.map(h => ({
                    username: h.user?.username || 'Unknown',
                    points: h.totalPoints,
                    level: h.level,
                    treasures: h.unlockedTreasures.length
                })),
                recentUsers
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Add a new treasure location to the map.
 * The request body should contain the treasure's name, description, clue,
 * coordinates (lat/lng), points value, and category.
 * @route   POST /api/admin/treasures
 * @param   {Object} req.body - The treasure data (name, description, clue, latitude, longitude, points, category)
 * @access  Admin only
 */
exports.createTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.create(req.body);
        res.status(201).json({
            success: true,
            data: treasure
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Edit an existing treasure's details (name, location, points, etc.).
 * Accepts partial updates — you only need to send the fields you want to change.
 * @route   PUT /api/admin/treasures/:id
 * @param   {string} req.params.id - The treasure's MongoDB ObjectId
 * @param   {Object} req.body - Fields to update
 * @access  Admin only
 */
exports.updateTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!treasure) {
            return res.status(404).json({
                success: false,
                error: 'Treasure not found'
            });
        }

        res.status(200).json({
            success: true,
            data: treasure
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Remove a treasure from the game entirely.
 * Also cleans up any player progress that references this treasure
 * so we don't leave orphaned data behind.
 * @route   DELETE /api/admin/treasures/:id
 * @param   {string} req.params.id - The treasure's MongoDB ObjectId
 * @access  Admin only
 */
exports.deleteTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.findById(req.params.id);

        if (!treasure) {
            return res.status(404).json({
                success: false,
                error: 'Treasure not found'
            });
        }

        // Remove this treasure from every player's unlocked list
        await UserProgress.updateMany(
            {},
            { $pull: { unlockedTreasures: treasure._id } }
        );

        await Treasure.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Wipe a player's progress back to zero.
 * Clears their unlocked treasures, points, badges, and resets their level.
 * Handy for testing or if a player wants a fresh start.
 * @route   POST /api/admin/users/:id/reset
 * @param   {string} req.params.id - The user's MongoDB ObjectId
 * @access  Admin only
 */
exports.resetUserProgress = async (req, res, next) => {
    try {
        const progress = await UserProgress.findOneAndUpdate(
            { user: req.params.id },
            {
                unlockedTreasures: [],
                totalPoints: 0,
                badges: [],
                level: 1,
                missionBriefing: null
            },
            { new: true }
        );

        if (!progress) {
            return res.status(404).json({
                success: false,
                error: 'User progress not found'
            });
        }

        res.status(200).json({
            success: true,
            data: progress,
            message: 'User progress has been reset'
        });
    } catch (err) {
        next(err);
    }
};
