require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  if (await User.findOne({ email })) { console.log('Admin already exists'); process.exit(0); }
  await User.create({ name: 'Admin', email, password: process.env.ADMIN_PASSWORD, role: 'admin',emailVerified:true });
  console.log('Admin created:', email);
  process.exit(0);
})();
