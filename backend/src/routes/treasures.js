/**
 * Treasure Routes — public and protected endpoints for campus treasures.
 * GET routes are public (everyone can see the map).
 * POST, PUT, DELETE require authentication.
 */

const express = require('express');
const {
    getTreasures,
    getTreasure,
    createTreasure,
    updateTreasure,
    deleteTreasure
} = require('../controllers/treasureController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET is public, POST requires auth
router.route('/')
    .get(getTreasures)
    .post(protect, createTreasure);

// GET by ID is public, PUT and DELETE require auth
router.route('/:id')
    .get(getTreasure)
    .put(protect, updateTreasure)
    .delete(protect, deleteTreasure);

module.exports = router;
