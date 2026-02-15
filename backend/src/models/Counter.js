const mongoose = require('mongoose');

/**
 * Counter Schema — a simple atomic counter used to generate unique Player IDs.
 * When a new player registers, we increment the "playerCount" counter
 * and append that number to their username (e.g., "aaron" + 42 = "aaron42").
 * Uses findOneAndUpdate with $inc to avoid race conditions.
 */
const CounterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: Number,
        default: 0
    }
});

/**
 * Atomically get the next value for a named counter.
 * Creates the counter if it doesn't exist yet (via upsert).
 * @param   {string} name - The counter name (e.g., 'playerCount')
 * @returns {number} The next sequential value
 */
CounterSchema.statics.getNextValue = async function (name) {
    const counter = await this.findOneAndUpdate(
        { name },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );
    return counter.value;
};

module.exports = mongoose.model('Counter', CounterSchema);
