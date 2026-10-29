require('dotenv').config();
const express = require('express');
require('express-async-errors'); // async route errors reach the error handler instead of crashing the server
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set in .env and be at least 32 characters long');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Render/Vercel sit behind one proxy, needed so rate limits see the real IP
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: (o, cb) => (!o || origins.includes(o) ? cb(null, true) : cb(new Error('Not allowed by CORS'))) }));;
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limits. Login/OTP are counted per email (not per IP) because a whole
// college lab can share one IP address.
const limit = (max, minutes, message, { byEmail = false, ...rest } = {}) => rateLimit({
  windowMs: minutes * 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false,
  message: { message },
  ...(byEmail && { keyGenerator: (req) => String(req.body?.email || '').toLowerCase() || 'no-email' }),
  ...rest
});
app.use('/api', limit(1500, 15, 'Too many requests. Please try again in a few minutes.'));
app.use('/api/auth/register', limit(100, 60, 'Too many sign-ups from this network. Try again later.'));
app.use('/api/auth/login', limit(10, 15, 'Too many wrong attempts for this email. Try again in 15 minutes.', { byEmail: true, skipSuccessfulRequests: true }));
app.use('/api/auth/send-otp', limit(5, 15, 'Too many OTP requests. Try again in 15 minutes.', { byEmail: true }));
app.use('/api/auth/verify-email', limit(10, 15, 'Too many tries. Try again in 15 minutes.', { byEmail: true }));
app.use('/api/auth/reset-password', limit(10, 15, 'Too many tries. Try again in 15 minutes.', { byEmail: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/student', require('./routes/student'));
app.use('/api/mentor', require('./routes/mentor'));
app.use('/api/admin', require('./routes/admin'));

// Never leak internal error details to the user
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || /^Only PNG/.test(err.message || '')) return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`GrowMate API on :${PORT}`)))
  .catch(e => { console.error('DB error', e.message); process.exit(1); });