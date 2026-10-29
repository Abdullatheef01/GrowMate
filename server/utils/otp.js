const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtp } = require('./mailer');

const TTL = 10 * 60 * 1000;      // OTP valid for 10 minutes
const COOLDOWN = 60 * 1000;      // 1 minute gap between OTPs
const MAX_ATTEMPTS = 5;

exports.issueOtp = async (user, purpose) => {
  if (user.otp?.lastSent && Date.now() - user.otp.lastSent < COOLDOWN)
    throw Object.assign(new Error('Please wait a minute before asking for another OTP'), { status: 429 });
  const otp = String(crypto.randomInt(100000, 1000000));
  user.otp = { hash: await bcrypt.hash(otp, 8), purpose, expires: new Date(Date.now() + TTL), attempts: 0, lastSent: new Date() };
  await user.save();
  await sendOtp(user.email, otp, purpose);
};

// returns null if OTP is right, otherwise the error message
exports.checkOtp = async (user, purpose, code) => {
  const o = user.otp;
  if (!o?.hash || o.purpose !== purpose) return 'No OTP requested. Please ask for a new one';
  if (o.expires < new Date()) return 'OTP expired. Please ask for a new one';
  if (o.attempts >= MAX_ATTEMPTS) return 'Too many wrong tries. Please ask for a new OTP';
  if (!(await bcrypt.compare(String(code || ''), o.hash))) {
    user.otp.attempts += 1;
    await user.save();
    return 'Wrong OTP';
  }
  return null;
};