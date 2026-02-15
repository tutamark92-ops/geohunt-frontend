/**
 * Progress Routes — tracks each player's treasure hunt journey.
 * All routes require authentication since progress is tied to a specific player.
 */

const express = require('express');
const {
    getProgress,
    unlockTreasure,
    updateBriefing
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Every progress route needs a logged-in user
router.use(protect);

// Get the player's current progress (unlocked treasures, points, badges, level)
router.get('/', getProgress);

// Unlock a treasure after scanning its QR code
router.post('/unlock/:treasureId', unlockTreasure);

// Save or update the AI-generated mission briefing
router.put('/briefing', updateBriefing);

module.exports = router;
