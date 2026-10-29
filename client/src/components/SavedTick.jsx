import { useState, useCallback } from 'react';

export function useFlash(ms = 1700) {
  const [on, setOn] = useState(false);
  const flash = useCallback(() => { setOn(true); setTimeout(() => setOn(false), ms); }, [ms]);
  return [on, flash];
}

export default function SavedTick({ show, text = 'Saved successfully' }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/25" role="status" aria-live="polite">
      <div className="tick-pop flex flex-col items-center gap-3 rounded-2xl bg-white px-10 py-8 shadow-xl">
        <svg width="72" height="72" viewBox="0 0 60 60" fill="none">
          <circle className="tick-ring" cx="30" cy="30" r="26" stroke="#6d23f0" strokeWidth="4" strokeLinecap="round" />
          <path className="tick-mark" d="M18 31l8 8 16-17" stroke="#6d23f0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="font-display text-base font-medium text-ink">{text}</p>
      </div>
    </div>
  );
}
