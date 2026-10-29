require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  let n = 0;
  for (const u of await User.find({ 'profile.aadhar': { $exists: true, $ne: '' } })) {
    const d = String(u.profile.aadhar).replace(/\D/g, '');
    if (d.length === 12) { u.profile.aadhar = `XXXX XXXX ${d.slice(-4)}`; await u.save(); n++; }
  }
  console.log('Masked:', n);
  process.exit(0);
})();