export default function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  const b = 'btn-ghost disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink/60">Page {page} of {pages} ({total} total)</p>
      <div className="flex gap-2">
        <button className={b} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className={b} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}