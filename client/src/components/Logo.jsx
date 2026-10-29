export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#6d23f0" />
      <path d="M12 24l8-8 8 8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 31l8-8 8 8" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-xl font-semibold ${light ? 'text-white' : 'text-ink'}`}>GrowMate</span>
    </div>
  );
}
