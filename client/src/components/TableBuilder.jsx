import { useEffect, useState,useRef} from 'react';
import api, { errMsg } from '../api';
import Modal from './Modal';
import Fab from './Fab';
import Empty from './Empty';
import useAction from '../hooks/useAction';
import { SkeletonCards } from './Skeleton';

const HEAD = {
  exam: ['Subject', 'Subject Code', 'CIAT 1', 'CIAT 2', 'Model Exam'],
  semester: ['Subject', 'Subject Code', 'Grade']
};

// One component for both "Score Table" (exam) and "Semester Table"
export default function TableBuilder({ kind, canCreate = true }) {
  
  const base = kind === 'exam' ? '/mentor/exam-tables' : '/mentor/semester-tables';
  const noun = kind === 'exam' ? 'score table' : 'semester table';
  const [tables, setTables] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, table = edit
  const load = () => api.get(base).then((r) => setTables(r.data));
  useEffect(() => { setTables(null); load(); }, [kind]); // eslint-disable-line
  
  const lock = useRef(false);
  const [busyId, setBusyId] = useState('');
  const act = async (id, fn) => {
    if (lock.current) return;
    lock.current = true; setBusyId(id);
    try { await fn(); await load(); } finally { lock.current = false; setBusyId(''); }
  };
  const toggle = (t) => act(t._id, () => api.patch(`${base}/${t._id}/publish`, { published: !t.published }));
  const del = (t) => { if (confirm(`Delete "${t.title}"? Student entries for it will be hidden.`)) act(t._id, () => api.delete(`${base}/${t._id}`)); };
    const [note, setNote] = useState('');
  const allowAll = (t) => {
    if (!confirm(`Let every student edit their saved entries in "${t.title}"?`)) return;
    act(t._id, async () => {
      const r = await api.patch(`${base}/${t._id}/allow-all`);
      setNote(`Editing allowed for ${r.data.count} student(s) in "${t.title}".`);
    });
  };
  
  return (
    <div>
       {note && <p role="status" className="mb-4 rounded-lg bg-tint px-3 py-2 text-sm text-brand-dark">{note}</p>}
      {!tables ? <SkeletonCards n={2} /> : !tables.length ? (
       <Empty title={`No ${noun}s yet`} hint={canCreate ? 'Tap the + button to create one. Students see it only after you publish.' : 'You can create tables once the admin assigns students to you.'} />
      ) : (
        
        <div className="space-y-5">
          {tables.map((t) => (
       <section key={t._id} className="card p-0">
  <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
    <div className="flex items-center gap-3">
      <h3 className="text-base font-semibold">{t.title}</h3>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.published ? 'bg-teal/15 text-teal' : 'bg-amber-soft text-amber'}`}>{t.published ? 'Published' : 'Draft'}</span>
    </div>
    <div className="flex gap-2">
      {t.published && <button className="btn-ghost disabled:opacity-50" disabled={!!busyId} onClick={() => allowAll(t)}>Allow all to edit</button>}
      <button className="btn-ghost disabled:opacity-50" disabled={!!busyId} onClick={() => setEditing(t)}>Edit</button>
      <button className="btn-ghost disabled:opacity-50" disabled={!!busyId} onClick={() => toggle(t)}>{busyId === t._id ? 'Please wait…' : t.published ? 'Unpublish' : 'Publish'}</button>
      <button className="btn-ghost !text-rose disabled:opacity-50" disabled={!!busyId} onClick={() => del(t)}>Delete</button>
    </div>
  </div>
  <div className="mt-3 overflow-x-auto pb-2">
    <table className="w-full min-w-[420px]">
      <thead><tr>{HEAD[kind].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
      <tbody>{t.rows.map((r) => (
        <tr key={r._id}><td className="td">{r.subject}</td><td className="td">{r.subjectCode}</td>
          {HEAD[kind].slice(2).map((h) => <td key={h} className="td bg-ink/[0.03]" />)}</tr>))}</tbody>
    </table>
  </div>
</section>
          ))}
        </div>
      )}
      {canCreate && <Fab label={`Add ${noun}`} onClick={() => setEditing({})} />}
      {editing && <TableModal kind={kind} base={base} initial={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function TableModal({ kind, base, initial, onClose, onDone }) {
  const blank = () => ({ subject: '', subjectCode: '' });
  const [title, setTitle] = useState(initial.title || '');
  const [rows, setRows] = useState(initial.rows?.length ? initial.rows.map((r) => ({ ...r })) : Array.from({ length: 5 }, blank));
  const [err, setErr] = useState('');
  const heads = HEAD[kind];

  const setCount = (n) => {
    n = Math.max(1, Math.min(40, Number(n) || 1));
    setRows(n >= rows.length ? [...rows, ...Array.from({ length: n - rows.length }, blank)] : rows.slice(0, n));
  };
  const setCell = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

    const [save, busy] = useAction(async (publish) => {
    setErr('');
    if (!title.trim()) return setErr(`Enter a title, for example "Semester 3"`);
    const clean = rows.filter((r) => r.subject.trim() || r.subjectCode.trim());
    if (!clean.length) return setErr('Add at least one subject');
    try {
      const payload = { title: title.trim(), rows: clean };
      const t = initial._id ? (await api.put(`${base}/${initial._id}`, payload)).data : (await api.post(base, payload)).data;
      if (publish && !t.published) await api.patch(`${base}/${t._id}/publish`, { published: true });
      onDone();
    } catch (e) { setErr(errMsg(e)); }
  });


  return (
    <Modal wide title={initial._id ? 'Edit table' : kind === 'exam' ? 'New score table' : 'New semester table'} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div><label className="label" htmlFor="tt">Title</label>
          <input id="tt" className="input" placeholder="Semester 3" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><label className="label" htmlFor="rc">Rows</label>
          <input id="rc" type="number" min="1" max="40" className="input" value={rows.length} onChange={(e) => setCount(e.target.value)} /></div>
      </div>

      <p className="mt-4 text-xs text-ink/55">Fill the subject and subject code. The grey columns are filled by students.</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead><tr>{heads.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              <td className="td"><input aria-label={`Subject ${i + 1}`} className="input" value={r.subject} onChange={(e) => setCell(i, 'subject', e.target.value)} /></td>
              <td className="td"><input aria-label={`Subject code ${i + 1}`} className="input" value={r.subjectCode} onChange={(e) => setCell(i, 'subjectCode', e.target.value)} /></td>
              {heads.slice(2).map((h) => <td key={h} className="td"><input disabled aria-label={h} className="input" /></td>)}
            </tr>))}</tbody>
        </table>
      </div>

      {err && <p role="alert" className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
        {initial.published ? (
          <button className="btn" disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : 'Save changes'}</button>
        ) : (
          <>
            <button className="btn-ghost disabled:opacity-50" disabled={busy} onClick={() => save(false)}>{busy ? 'Please wait…' : 'Save draft'}</button>
            <button className="btn" disabled={busy} onClick={() => save(true)}>{busy ? 'Please wait…' : 'Publish'}</button>
          </>
        )}
      </div>
    </Modal>
  );
}
