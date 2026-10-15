// Vercel serverless entry point. For a long-running server use `npm start` (Render/VPS) instead.
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const ensureAdmin = require('../src/utils/ensureAdmin');
const app = require('../src/app');

let ready;

module.exports = async (req, res) => {
  try {
    ready = ready || connectDB(env.mongoUri).then(ensureAdmin);
    await ready;
  } catch (err) {
    ready = undefined;
    console.error('Database connection failed:', err.message);
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }
  return app(req, res);
};
