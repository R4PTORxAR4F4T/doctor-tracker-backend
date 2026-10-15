const User = require('../models/User');
const env = require('../config/env');

// Idempotently creates the admin account described by ADMIN_* env variables.
async function ensureAdmin() {
  if (!env.adminEmail || !env.adminPassword) return null;

  const email = env.adminEmail.toLowerCase();
  const existing = await User.exists({ email });
  if (existing) return null;

  const user = await User.create({
    name: env.adminName,
    email,
    password: env.adminPassword,
    role: 'admin',
  });
  console.log(`Admin account created: ${user.email}`);
  return user;
}

module.exports = ensureAdmin;
