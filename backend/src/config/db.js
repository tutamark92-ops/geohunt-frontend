const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the connection string from environment variables.
 * Called once at server startup. If the connection fails, the process exits
 * with code 1 so the deployment platform knows something went wrong.
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
