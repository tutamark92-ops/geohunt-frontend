/**
 * Feedback Routes — players submit feedback, admins view all.
 * POST /          - Submit feedback (authenticated players)
 * GET  /mine      - Get your own feedback (authenticated players)
 * GET  /          - Get all feedback (admin only)
 */

const express = require('express');
const { submitFeedback, getMyFeedback, getAllFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Player endpoints — submit and view own feedback
router.post('/', protect, submitFeedback);
router.get('/mine', protect, getMyFeedback);

// Admin endpoint — view all feedback
router.get('/', protect, authorize('admin'), getAllFeedback);

module.exports = router;
