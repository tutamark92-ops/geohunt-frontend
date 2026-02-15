/**
 * Leaderboard Routes — public endpoint for the player rankings.
 * No authentication required — anyone can see the top players.
 */

const express = require('express');
const { getLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

// Public — returns the top players ranked by total points
router.get('/', getLeaderboard);

module.exports = router;
