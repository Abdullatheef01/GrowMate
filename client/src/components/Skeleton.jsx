export const Sk = ({ className = '' }) => (
  <div aria-hidden="true" className={`animate-pulse rounded-md bg-ink/10 motion-reduce:animate-none ${className}`} />
);

export function SkeletonRows({ n = 5 }) {
  return (
    <ul role="status" aria-label="Loading" className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-3">
          <Sk className="h-11 w-11 shrink-0 !rounded-full" />
          <div className="flex-1 space-y-2"><Sk className="h-4 w-1/3" /><Sk className="h-3 w-1/2" /></div>
          <Sk className="h-9 w-20" />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonCards({ n = 4 }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card space-y-3"><Sk className="h-5 w-2/3" /><Sk className="h-3 w-full" /><Sk className="h-3 w-5/6" /><Sk className="h-3 w-1/3" /></div>
      ))}
    </div>
  );
}

export function SkeletonView() {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex items-center gap-4"><Sk className="h-16 w-16 !rounded-full" /><div className="space-y-2"><Sk className="h-5 w-40" /><Sk className="h-3 w-28" /></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="space-y-1.5"><Sk className="h-3 w-20" /><Sk className="h-4 w-36" /></div>)}</div>
      <Sk className="mt-8 h-32 w-full" />
    </div>
  );
}
// Full page placeholder shown while the app checks who is logged in
export function SkeletonPage() {
  return (
    <div role="status" aria-label="Loading" className="min-h-screen">
      <div className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5"><Sk className="h-9 w-9 !rounded-xl" /><Sk className="h-5 w-24" /></div>
          <Sk className="h-10 w-10 !rounded-full" />
        </div>
      </div>
      <div className="h-12 bg-brand" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Sk className="h-7 w-56" />
        <Sk className="mt-2 h-4 w-40" />
        <div className="mt-6"><SkeletonCards /></div>
      </div>
    </div>
  );
}