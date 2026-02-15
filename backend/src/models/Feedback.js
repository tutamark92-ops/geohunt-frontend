const mongoose = require('mongoose');

/**
 * Feedback Schema — stores player feedback, suggestions, and bug reports.
 * Each entry is tied to the user who submitted it.
 */
const FeedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: [true, 'Please select a feedback type'],
        enum: ['bug', 'suggestion', 'general']
    },
    message: {
        type: String,
        required: [true, 'Please add a message'],
        trim: true,
        maxlength: [1000, 'Message cannot be more than 1000 characters']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
