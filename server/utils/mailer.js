const nodemailer = require('nodemailer');

// Render free blocks SMTP ports, so on the server we send through Brevo's HTTPS API.
const sendViaBrevo = async (to, subject, text) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'GrowMate', email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      textContent: text
    })
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
};

// Gmail SMTP is used for local testing
const sendViaSmtp = (to, subject, text) =>
  nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT || 587),
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  }).sendMail({ from: process.env.MAIL_FROM || process.env.MAIL_USER, to, subject, text });

exports.sendOtp = async (to, otp, purpose) => {
  const subject = purpose === 'verify' ? 'Verify your GrowMate account' : 'Reset your GrowMate password';
  const text = `Your GrowMate OTP is ${otp}. It is valid for 10 minutes. Do not share it with anyone.`;
  if (process.env.BREVO_API_KEY) return sendViaBrevo(to, subject, text);
  if (process.env.MAIL_USER) return sendViaSmtp(to, subject, text);
  if (process.env.NODE_ENV !== 'production') { console.log(`[DEV] OTP for ${to}: ${otp}`); return; }
  throw new Error('No mail provider configured');
};