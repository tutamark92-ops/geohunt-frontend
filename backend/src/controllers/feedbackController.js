const Feedback = require('../models/Feedback');

/**
 * @desc    Submit new feedback
 * @route   POST /api/feedback
 * @access  Private (any authenticated player)
 */
exports.submitFeedback = async (req, res, next) => {
    try {
        const { type, message, rating } = req.body;

        const feedback = await Feedback.create({
            user: req.user.id,
            type,
            message,
            rating
        });

        res.status(201).json({
            success: true,
            data: feedback
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get current user's own feedback
 * @route   GET /api/feedback/mine
 * @access  Private (any authenticated player)
 */
exports.getMyFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: feedback.length,
            data: feedback
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all feedback from all users (admin only)
 * @route   GET /api/feedback
 * @access  Private/Admin
 */
exports.getAllFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.find()
            .populate('user', 'username email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: feedback.length,
            data: feedback
        });
    } catch (err) {
        next(err);
    }
};
