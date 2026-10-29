import { rules } from '../utils/password';

const NAMES = ['Weak', 'Medium', 'Strong'];
const BAR = ['bg-rose', 'bg-amber', 'bg-teal'];
const TEXT = ['text-rose', 'text-amber', 'text-teal'];

export default function PasswordMeter({ password }) {
  if (!password) return null;
  const passed = rules.filter((r) => r.test(password)).length;
  const level = passed <= 2 ? 0 : passed < 5 ? 1 : 2;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= level ? BAR[level] : 'bg-ink/10'}`} />)}
      </div>
      <p className={`mt-1 text-xs font-medium ${TEXT[level]}`}>{NAMES[level]}</p>
      <ul className="mt-1 space-y-0.5">
        {rules.map((r) => (
          <li key={r.label} className={`text-xs ${r.test(password) ? 'text-teal' : 'text-ink/50'}`}>
            {r.test(password) ? '✓' : '○'} {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}