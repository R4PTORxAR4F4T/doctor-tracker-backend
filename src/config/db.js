const mongoose = require('mongoose');

// Cache the connection on `global` so serverless runtimes (Vercel) reuse it
// between invocations instead of opening a new pool every time.
const cache = global.__mongooseCache || (global.__mongooseCache = { conn: null, promise: null });

async function connectDB(uri) {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

module.exports = connectDB;
