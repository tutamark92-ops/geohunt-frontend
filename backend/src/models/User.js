const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * User Schema — represents a registered player or admin.
 * Players get a unique playerId (like "aaron42") for easy login.
 * Admins additionally have an email + hashed password for the dashboard.
 */
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        trim: true,
        maxlength: [30, 'Username cannot be more than 30 characters']
    },
    playerId: {
        type: String,
        unique: true,
        sparse: true  // Allows null values to not conflict with the unique index
    },
    playerNumber: {
        type: Number
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        minlength: 6,
        select: false  // Never return password in queries by default
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

/**
 * Hash the password before saving to the database.
 * Only runs when the password field has actually been changed,
 * so updating a user's username won't re-hash an unchanged password.
 */
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Generate a signed JWT token for this user.
 * The token encodes the user's ID and expires after the time set in JWT_EXPIRE env var.
 * @returns {string} The signed JWT token string
 */
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

/**
 * Compare a plaintext password against the user's stored hash.
 * Used during admin login to verify credentials.
 * @param   {string} enteredPassword - The plaintext password to check
 * @returns {boolean} True if the password matches
 */
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
