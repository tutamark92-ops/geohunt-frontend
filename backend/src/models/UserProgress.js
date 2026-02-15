const mongoose = require('mongoose');

/**
 * UserProgress Schema — tracks each player's journey through the treasure hunt.
 * Stores which treasures they've found, their total XP, earned badges, and level.
 * Each user has exactly one progress document (enforced by the unique user reference).
 */
const UserProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    unlockedTreasures: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Treasure'
    }],
    totalPoints: {
        type: Number,
        default: 0
    },
    badges: [{
        type: String
    }],
    level: {
        type: Number,
        default: 1
    },
    missionBriefing: {
        type: String
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

/**
 * Automatically update the timestamp whenever progress is saved.
 * This lets us track when a player was last active.
 */
UserProgressSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

/**
 * Recalculate the player's level based on their total points.
 * Every 200 XP earns a new level (0-199 = Level 1, 200-399 = Level 2, etc.).
 * @returns {number} The newly calculated level
 */
UserProgressSchema.methods.calculateLevel = function () {
    this.level = Math.floor(this.totalPoints / 200) + 1;
    return this.level;
};

/**
 * Check and award badges based on the player's current achievements.
 * Badge criteria:
 *   - "explorer"   → Found at least 1 treasure (everyone's first milestone!)
 *   - "scholar"    → Found ALL treasures in the 'academic' category
 *   - "socialite"  → Found at least 1 treasure in the 'social' category
 *   - "master"     → Found every single treasure on the map (the ultimate flex)
 * @returns {string[]} Updated array of badge IDs the player has earned
 */
UserProgressSchema.methods.checkBadges = async function () {
    const Treasure = mongoose.model('Treasure');

    // Rookie Scout — first treasure unlocked
    if (this.unlockedTreasures.length >= 1 && !this.badges.includes('explorer')) {
        this.badges.push('explorer');
    }

    // High IQ — completed all academic treasures
    const academicTreasures = await Treasure.find({ category: 'academic' });
    const academicIds = academicTreasures.map(t => t._id.toString());
    const unlockedIds = this.unlockedTreasures.map(id => id.toString());
    const hasAllAcademic = academicIds.every(id => unlockedIds.includes(id));
    if (hasAllAcademic && academicTreasures.length > 0 && !this.badges.includes('scholar')) {
        this.badges.push('scholar');
    }

    // Social Star — visited at least one social venue
    const socialTreasures = await Treasure.find({ category: 'social' });
    const hasSocial = socialTreasures.some(t => unlockedIds.includes(t._id.toString()));
    if (hasSocial && !this.badges.includes('socialite')) {
        this.badges.push('socialite');
    }

    // Elite Hunter — found absolutely everything
    const allTreasures = await Treasure.find();
    if (this.unlockedTreasures.length === allTreasures.length && allTreasures.length > 0 && !this.badges.includes('master')) {
        this.badges.push('master');
    }

    return this.badges;
};

module.exports = mongoose.model('UserProgress', UserProgressSchema);
