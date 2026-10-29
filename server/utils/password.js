const COMMON = ['password', '12345678', '123456789', 'qwerty', 'iloveyou', 'abc12345', 'welcome1', 'growmate', 'admin123'];

// returns an error message, or null if the password is fine
exports.passwordProblem = (pw, { name = '', email = '' } = {}) => {
  pw = String(pw || '');
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 64) return 'Password is too long (max 64 characters)';
  if (!/[a-z]/.test(pw)) return 'Add a small letter (a-z) to your password';
  if (!/[A-Z]/.test(pw)) return 'Add a capital letter (A-Z) to your password';
  if (!/\d/.test(pw)) return 'Add a number (0-9) to your password';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Add a symbol like @ # $ ! to your password';
  const low = pw.toLowerCase();
  if (COMMON.some((c) => low.includes(c))) return 'This password is too common. Choose another one';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && low.includes(local)) return 'Password should not contain your email name';
  const first = String(name).trim().split(/\s+/)[0].toLowerCase();
  if (first.length >= 4 && low.includes(first)) return 'Password should not contain your name';
  return null;
};