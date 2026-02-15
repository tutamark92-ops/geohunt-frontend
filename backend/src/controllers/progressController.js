const UserProgress = require('../models/UserProgress');
const Treasure = require('../models/Treasure');

/**
 * Get the current player's game progress.
 * Returns their unlocked treasures (fully populated), total points, badges, and level.
 * If no progress record exists yet, we create a fresh one automatically.
 * @route   GET /api/progress
 * @access  Protected (requires valid JWT)
 * @returns {Object} The player's full progress with unlocked treasures
 */
exports.getProgress = async (req, res, next) => {
    try {
        let progress = await UserProgress.findOne({ user: req.user.id })
            .populate('unlockedTreasures');

        // Auto-create progress if this is a first-time login
        if (!progress) {
            progress = await UserProgress.create({
                user: req.user.id,
                unlockedTreasures: [],
                totalPoints: 0,
                badges: [],
                level: 1
            });
        }

        res.status(200).json({
            success: true,
            data: progress
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Unlock a treasure after the player scans its QR code.
 * This is the main game action — it:
 *   1. Verifies the treasure actually exists
 *   2. Checks the player hasn't already unlocked it (no double-dipping!)
 *   3. Awards the points
 *   4. Recalculates their level
 *   5. Checks if they've earned any new badges
 * @route   POST /api/progress/unlock/:treasureId
 * @param   {string} req.params.treasureId - The treasure's MongoDB ObjectId (from the QR code)
 * @access  Protected (requires valid JWT)
 * @returns {Object} Updated progress with new points, level, and any newly earned badges
 */
exports.unlockTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.findById(req.params.treasureId);

        if (!treasure) {
            return res.status(404).json({
                success: false,
                error: 'Treasure not found'
            });
        }

        let progress = await UserProgress.findOne({ user: req.user.id });

        // Auto-create progress if it doesn't exist yet
        if (!progress) {
            progress = await UserProgress.create({
                user: req.user.id,
                unlockedTreasures: [],
                totalPoints: 0,
                badges: [],
                level: 1
            });
        }

        // Prevent unlocking the same treasure twice
        if (progress.unlockedTreasures.includes(treasure._id)) {
            return res.status(400).json({
                success: false,
                error: 'Treasure already unlocked'
            });
        }

        // Award the treasure and recalculate everything
        progress.unlockedTreasures.push(treasure._id);
        progress.totalPoints += treasure.points;
        progress.calculateLevel();
        await progress.checkBadges();
        await progress.save();
        await progress.populate('unlockedTreasures');

        res.status(200).json({
            success: true,
            data: progress,
            message: `Unlocked "${treasure.name}" for ${treasure.points} points!`
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Save or update the AI-generated mission briefing for a player.
 * The briefing is a personalized welcome message created by Gemini when they first join.
 * @route   PUT /api/progress/briefing
 * @param   {string} req.body.missionBriefing - The AI-generated briefing text to store
 * @access  Protected (requires valid JWT)
 */
exports.updateBriefing = async (req, res, next) => {
    try {
        const { missionBriefing } = req.body;

        const progress = await UserProgress.findOneAndUpdate(
            { user: req.user.id },
            { missionBriefing },
            { new: true, runValidators: true }
        ).populate('unlockedTreasures');

        res.status(200).json({
            success: true,
            data: progress
        });
    } catch (err) {
        next(err);
    }
};
