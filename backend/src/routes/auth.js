/**
 * Auth Routes — handles player registration and login.
 * Two public routes (register, login) and one protected route (getMe).
 */

const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public — anyone can register or log in
router.post('/register', register);
router.post('/login', login);

// Protected — requires a valid JWT to fetch the current user's profile
router.get('/me', protect, getMe);

module.exports = router;
