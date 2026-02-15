/**
 * Netlify Serverless Function — wraps the Express app for Netlify Functions.
 * All /api/* requests are redirected here via netlify.toml.
 * 
 * Note: Netlify automatically injects environment variables set in the dashboard
 * into process.env — no dotenv needed here.
 */
const serverless = require('serverless-http');
const app = require('../../backend/src/app');

module.exports.handler = serverless(app);
