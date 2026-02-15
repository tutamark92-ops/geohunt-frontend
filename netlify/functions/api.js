/**
 * Netlify Serverless Function — wraps the Express app for Netlify Functions.
 * All /api/* requests are redirected here via netlify.toml.
 */
const serverless = require('serverless-http');

// Load environment before importing app
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const app = require('../../backend/src/app');

// Wrap Express app for serverless execution
module.exports.handler = serverless(app);
