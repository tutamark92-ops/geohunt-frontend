/**
 * Admin Routes — all endpoints for managing the game from the admin dashboard.
 * Every route here requires both authentication AND admin role.
 * Regular players get a 403 if they try to access these.
 */

const express = require('express');
const {
    getUsers,
    getUser,
    updateUserRole,
    deleteUser,
    getStats,
    createTreasure,
    updateTreasure,
    deleteTreasure,
    resetUserProgress
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Lock down all routes — must be logged in and must be an admin
router.use(protect);
router.use(authorize('admin'));

// Dashboard overview stats
router.get('/stats', getStats);

// User management — view, promote, reset, or remove players
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/role', updateUserRole);
router.post('/users/:id/reset', resetUserProgress);
router.delete('/users/:id', deleteUser);

// Treasure management — create, edit, or remove map locations
router.post('/treasures', createTreasure);
router.put('/treasures/:id', updateTreasure);
router.delete('/treasures/:id', deleteTreasure);

module.exports = router;
