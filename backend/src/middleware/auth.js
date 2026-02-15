const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware — protects routes that require a logged-in user.
 * Extracts the JWT from the Authorization header (format: "Bearer <token>"),
 * verifies it, and attaches the user object to req.user for downstream use.
 * If anything goes wrong, the request is rejected with a 401.
 * @param {Object}   req  - Express request object
 * @param {Object}   res  - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    // No token? No entry.
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }

    try {
        // Decode the token and look up the user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }
};

/**
 * Role-based access control middleware.
 * Restricts a route to users with specific roles (e.g., 'admin').
 * Must be used AFTER the protect middleware so req.user is available.
 * @param   {...string} roles - The allowed roles (e.g., 'admin', 'user')
 * @returns {Function}  Express middleware function
 * @example router.get('/stats', protect, authorize('admin'), getStats);
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};
