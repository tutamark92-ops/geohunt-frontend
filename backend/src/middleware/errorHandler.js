/**
 * Global error handler middleware.
 * Catches errors thrown by controllers and formats them into a consistent JSON response.
 * Handles common Mongoose errors (bad IDs, duplicates, validation failures)
 * so we don't have to repeat this logic in every controller.
 * @param {Error}  err  - The thrown error object
 * @param {Object} req  - Express request object
 * @param {Object} res  - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log the full stack trace for debugging during development
    console.error(err.stack);

    // Mongoose bad ObjectId — someone passed an invalid ID format
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key — e.g., trying to register with a taken username
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error — required fields missing or invalid values
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = { message, statusCode: 400 };
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler;
