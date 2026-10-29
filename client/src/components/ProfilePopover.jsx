// Small card under the header's profile icon. Closed with the X.
export default function ProfilePopover({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute right-4 top-[72px] w-[min(92vw,22rem)] rounded-2xl border border-ink/10 bg-white p-5 shadow-xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-xl text-ink/60 hover:bg-tint hover:text-brand">×</button>
        {children}
      </div>
    </div>
  );
}
