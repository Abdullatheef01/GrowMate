// Violet bar with horizontally scrolling tabs; active tab is white with an underline.
export default function ScrollTabs({ tabs, active, onChange }) {
  return (
    <nav className="bg-brand" aria-label="Sections">
      <div className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            aria-current={active === t}
            className={`shrink-0 border-b-[3px] px-4 py-3.5 font-display text-sm font-medium transition ${
              active === t ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </nav>
  );
}
