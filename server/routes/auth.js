const router = require('express').Router();
const { passwordProblem } = require('../utils/password');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { token } = require('../utils/helpers');
const { issueOtp, checkOtp } = require('../utils/otp');

const GENERIC = { message: 'If this email is registered, an OTP has been sent.' };

// New sign-ups are always students. Admin creates mentors later.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, registerNumber } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    const pwErr = passwordProblem(password, { name, email });
    if (pwErr) return res.status(400).json({ message: pwErr });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ message: 'This email is already registered. Please log in.' });

    const reg = (registerNumber || '').trim().toUpperCase();
    if (reg && await User.exists({ registerNumber: reg }))
      return res.status(400).json({ message: 'This register number is already registered' });

    const user = await User.create({ name, email, password, registerNumber: reg || undefined, role: 'student' });
    try { await issueOtp(user, 'verify'); }
    catch { return res.status(500).json({ message: 'Account created but the OTP email failed. Log in to get a new OTP.' }); }
    res.status(201).json({ message: 'OTP sent to your email', email: user.email });
  } catch (e) { res.status(500).json({ message: 'Something went wrong' }); }
});

router.post('/verify-email', async (req, res) => {
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Wrong OTP' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });
    const bad = await checkOtp(user, 'verify', req.body.otp);
    if (bad) return res.status(400).json({ message: bad });
    user.emailVerified = true; user.otp = undefined;
    await user.save();
    res.json({ message: 'Email verified' });
  } catch (e) { res.status(500).json({ message: 'Something went wrong' }); }
});

// purpose = 'verify' or 'reset'
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!['verify', 'reset'].includes(purpose)) return res.status(400).json({ message: 'Invalid request' });
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || (purpose === 'verify' && user.emailVerified)) return res.json(GENERIC);
    await issueOtp(user, purpose);
    res.json(GENERIC);
  } catch (e) {
    res.status(e.status || 500).json({ message: e.status ? e.message : 'Could not send the email. Try again later.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Wrong OTP' });
    const bad = await checkOtp(user, 'reset', otp);
    if (bad) return res.status(400).json({ message: bad });
    const pwErr = passwordProblem(password, { name: user.name, email: user.email });
    if (pwErr) return res.status(400).json({ message: pwErr });
    user.password = password; user.emailVerified = true; user.otp = undefined;
    await user.save();
    res.json({ message: 'Password changed' });
  } catch (e) { res.status(500).json({ message: 'Something went wrong' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await user.matchPassword(password || '')))
      return res.status(401).json({ message: 'Wrong email or password' });
      if (user.disabled) return res.status(403).json({ message: 'Your account is disabled. Please contact the admin.' });
    if (!user.emailVerified) {
      try { await issueOtp(user, 'verify'); } catch { /* cooldown: an OTP was sent recently */ }
      return res.status(403).json({ message: 'Please verify your email first', needsVerify: true });
    }
    const u = user.toObject(); delete u.password; delete u.otp;
    res.json({ token: token(user._id), user: u });
  } catch (e) { res.status(500).json({ message: 'Something went wrong' }); }
});

router.get('/me', protect, async (req, res) => {
  const u = await User.findById(req.user._id).select('-password -otp').populate('mentor', 'name email phone department photo');
  res.json(u);
});

// Admin can change own email + password any time
router.put('/admin-credentials', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
  const { email, password } = req.body;
  const u = await User.findById(req.user._id);
  if (email) u.email = email;
  if (password) {
   const pwErr = passwordProblem(password, { name: u.name, email: u.email });
if (pwErr) return res.status(400).json({ message: pwErr });
    u.password = password;
  }
  await u.save();
  res.json({ message: 'Saved' });
});

module.exports = router;