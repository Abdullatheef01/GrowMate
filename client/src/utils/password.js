export const rules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'A small letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'A capital letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'A number (0-9)', test: (p) => /\d/.test(p) },
  { label: 'A symbol like @ # $ !', test: (p) => /[^A-Za-z0-9]/.test(p) }
];
export const isStrong = (p) => rules.every((r) => r.test(p));
export const personalProblem = (pw, name = '', email = '') => {
  const low = String(pw).toLowerCase();
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && low.includes(local)) return 'Password should not contain your email name';
  const first = String(name).trim().split(/\s+/)[0].toLowerCase();
  if (first.length >= 4 && low.includes(first)) return 'Password should not contain your name';
  return null;
};