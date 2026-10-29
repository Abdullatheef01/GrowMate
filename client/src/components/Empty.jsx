export default function Empty({ title, hint }) {
  return (
    <div className="rounded-xl border border-dashed border-brand/30 bg-white px-6 py-12 text-center">
      <p className="font-display text-base font-medium text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-ink/60">{hint}</p>}
    </div>
  );
}
