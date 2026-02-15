const mongoose = require('mongoose');

/**
 * Treasure Schema — defines a hidden treasure location on the campus map.
 * Each treasure has a real-world GPS coordinate, a clue for players to find it,
 * and a point value that gets awarded when someone scans its QR code.
 */
const TreasureSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a treasure name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    clue: {
        type: String,
        required: [true, 'Please add a clue'],
        maxlength: [300, 'Clue cannot be more than 300 characters']
    },
    latitude: {
        type: Number,
        required: [true, 'Please add latitude']
    },
    longitude: {
        type: Number,
        required: [true, 'Please add longitude']
    },
    points: {
        type: Number,
        required: [true, 'Please add points value'],
        min: [1, 'Points must be at least 1']
    },
    trivia: {
        type: String,
        maxlength: [500, 'Trivia cannot be more than 500 characters']
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: ['academic', 'social', 'sports', 'history']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Treasure', TreasureSchema);
