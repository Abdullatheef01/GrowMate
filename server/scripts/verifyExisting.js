require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const r = await User.updateMany({}, { emailVerified: true });
  console.log('Marked verified:', r.modifiedCount);
  process.exit(0);
})();