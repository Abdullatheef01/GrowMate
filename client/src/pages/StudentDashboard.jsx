import { useEffect, useState,useRef } from 'react';
import Avatar from '../components/Avatar';
import ProfilePopover from '../components/ProfilePopover';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api';
import Header from '../components/Header';
import ScrollTabs from '../components/ScrollTabs';
import Empty from '../components/Empty';
import SavedTick, { useFlash } from '../components/SavedTick';
import { mentorName } from '../utils/names';
import useAction from '../hooks/useAction'; 
import { SkeletonCards } from '../components/Skeleton';

const TABS = ['Counselling', 'CIAT / Model Exam', 'Semester Score'];
const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function StudentDashboard() {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState(TABS[0]);
  const [menu, setMenu] = useState(false);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen">
      <Header user={user} onProfile={() => setMenu(true)} />
        {menu && (
          <ProfilePopover onClose={() => setMenu(false)}>
            <div className="flex items-center gap-3">
              <Avatar user={user} size={56} />
              <div className="min-w-0 pr-8">
                <p className="truncate font-display font-semibold">{user.name}</p>
                <p className="truncate text-sm text-ink/60">{user.email}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button className="btn" onClick={() => nav('/student/profile')}>My profile</button>
              <button className="btn-ghost" onClick={logout}>Log out</button>
            </div>
          </ProfilePopover>
        )}
      <ScrollTabs tabs={TABS} active={tab} onChange={setTab} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-semibold">Welcome, {user.name}</h2>
        <p className="mt-1 text-sm text-ink/60">
          {user.mentor ? <>Your mentor: <span className="font-medium text-brand">{user.mentor.name}</span></> : 'A mentor has not been assigned to you yet.'}
        </p>
        <div className="mt-6">
          {tab === TABS[0] && <Counselling />}
          {tab === TABS[1] && <ExamTab />}
          {tab === TABS[2] && <SemesterTab />}
        </div>
      </main>
    </div>
  );
}

/* ---------------- Counselling ---------------- */
function Counselling() {
  const [list, setList] = useState(null);
  const load = () => api.get('/student/counselling').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

    const lock = useRef(false);
  const [busyId, setBusyId] = useState('');
  const accept = async (id) => {
    if (lock.current) return;
    lock.current = true; setBusyId(id);
    try { await api.patch(`/student/counselling/${id}/accept`); await load(); }
    finally { lock.current = false; setBusyId(''); }
  };

 if (!list) return <SkeletonCards />;
  if (!list.length) return <Empty title="No counselling yet" hint="When your mentor records a counselling session for you, it will show up here for you to confirm." />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((c) => (
        <article key={c._id} className="card">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold">{c.title}</h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === 'accepted' ? 'bg-teal/15 text-teal' : 'bg-amber-soft text-amber'}`}>
              {c.status === 'accepted' ? 'Accepted' : 'Pending'}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-ink/75">{c.description}</p>
          <p className="mt-4 text-xs text-ink/55">By {mentorName(c.mentor)} on {fmt(c.createdAt)}</p>
          {c.status === 'pending' && <button className="btn mt-4" disabled={!!busyId} onClick={() => accept(c._id)}>{busyId === c._id ? 'Accepting…' : 'Accept'}</button>}
        </article>
      ))}
    </div>
  );
}

/* ---------------- CIAT / Model exam ---------------- */
function ExamTab() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get('/student/exam-tables').then((r) => setItems(r.data)); }, []);
  if (!items) return <SkeletonCards n={2} />;
  if (!items.length) return <Empty title="No exam tables yet" hint="Your mentor will publish CIAT and model exam tables here. You can then add your own scores." />;
  return <div className="space-y-6">{items.map((it) => <ExamCard key={it.table._id} item={it} />)}</div>;
}

// Edit button: only after saving. Greyed out until the mentor or admin allows editing.
function EditControl({ editable, saved, allowed, editing, onEdit }) {
  if (!editable || !saved || editing) return null;
  return (
    <div className="text-right">
      <button className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50" disabled={!allowed} onClick={onEdit}>Edit</button>
      {!allowed && <p className="mt-1 text-xs text-ink/55">Locked. Ask your mentor to allow editing.</p>}
    </div>
  );
}

const validMark = (x) => {
  if (!x || x === 'AB' || x === 'U') return true;
  const n = Number(x);
  return !Number.isNaN(n) && n >= 0 && n <= 100;
};

function ExamCard({ item }) {
  const { table, editable } = item;
  const init = {};
  item.scores.forEach((s) => { init[s.row] = s; });
  const [vals, setVals] = useState(init);
  const [base, setBase] = useState(init);          // last saved values, used by Cancel
  const [saved, setSaved] = useState(item.saved);
  const [allowed, setAllowed] = useState(item.editAllowed);
  const [editing, setEditing] = useState(editable && !item.saved);
  const [done, flash] = useFlash();
  const [err, setErr] = useState('');
  const set = (row, k, v) => setVals({ ...vals, [row]: { ...vals[row], [k]: v.toUpperCase().replace(/[^0-9.ABU]/g, '') } });

  const [save, saving] = useAction(async () => {
    setErr('');
    const bad = Object.values(vals).some((v) => ['ciat1', 'ciat2', 'model'].some((k) => !validMark(v?.[k])));
    if (bad) return setErr('Marks must be 0 to 100, AB (absent) or U (fail)');
    try {
      await api.put(`/student/exam-tables/${table._id}/scores`, {
        scores: table.rows.map((r) => ({ row: r._id, ciat1: vals[r._id]?.ciat1 || '', ciat2: vals[r._id]?.ciat2 || '', model: vals[r._id]?.model || '' }))
      });
      setBase(vals); setSaved(true); setAllowed(false); setEditing(false);  // locks again after saving
      flash();
    } catch (e) { setErr(errMsg(e)); }
  });

  const cancel = () => { setVals(base); setErr(''); setEditing(false); };
  const open = editable && editing;

  return (
    <section className="card p-0">
      <SavedTick show={done} />
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="text-base font-semibold">{table.title}</h3>
          {open && <p className="mt-1 text-xs text-ink/55">Enter marks from 0 to 100. Absent: AB, Fail: U.</p>}
        </div>
        <EditControl editable={editable} saved={saved} allowed={allowed} editing={editing} onEdit={() => setEditing(true)} />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead><tr>{['Subject', 'Subject Code', 'CIAT 1', 'CIAT 2', 'Model Exam'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r._id}>
                <td className="td">{r.subject}</td>
                <td className="td text-ink/70">{r.subjectCode}</td>
                {['ciat1', 'ciat2', 'model'].map((k) => (
                  <td key={k} className="td">
                    <input aria-label={`${r.subject} ${k}`} inputMode="text" maxLength={5} disabled={!open} className="input w-24"
                      value={vals[r._id]?.[k] || ''} onChange={(e) => set(r._id, k, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        {open && <button className="btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save scores'}</button>}
        {open && saved && <button className="btn-ghost" disabled={saving} onClick={cancel}>Cancel</button>}
        {!editable && <p className="text-sm text-ink/60">This table is from a former mentor. You can only view it.</p>}
        {err && <span role="alert" className="text-sm text-rose">{err}</span>}
      </div>
    </section>
  );
}

/* ---------------- Semester score ---------------- */
function SemesterTab() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get('/student/semester-tables').then((r) => setItems(r.data)); }, []);
  if (!items) return <SkeletonCards n={2} />;
  if (!items.length) return <Empty title="No semester tables yet" hint="Once your mentor publishes a semester table, enter your grades, arrears and CGPA here." />;
  return <div className="space-y-6">{items.map((it) => <SemesterCard key={it.table._id} item={it} />)}</div>;
}

function SemesterCard({ item }) {
  const { table, result, editable } = item;
  const initG = {};
  (result?.grades || []).forEach((g) => { initG[g.row] = g.grade; });
  const [grades, setGrades] = useState(initG);
  const [arrears, setArrears] = useState(result?.arrears ?? 0);
  const [cgpa, setCgpa] = useState(result?.cgpa ?? '');
  const [base, setBase] = useState({ grades: initG, arrears: result?.arrears ?? 0, cgpa: result?.cgpa ?? '' });
  const [saved, setSaved] = useState(item.saved);
  const [allowed, setAllowed] = useState(item.editAllowed);
  const [editing, setEditing] = useState(editable && !item.saved);
  const [done, flash] = useFlash();
  const [err, setErr] = useState('');

  const [save, saving] = useAction(async () => {
    setErr('');
    try {
      await api.put(`/student/semester-tables/${table._id}/result`, {
        grades: table.rows.map((r) => ({ row: r._id, grade: grades[r._id] || '' })), arrears, cgpa
      });
      setBase({ grades, arrears, cgpa }); setSaved(true); setAllowed(false); setEditing(false);
      flash();
    } catch (e) { setErr(errMsg(e)); }
  });

  const cancel = () => { setGrades(base.grades); setArrears(base.arrears); setCgpa(base.cgpa); setErr(''); setEditing(false); };
  const open = editable && editing;

  return (
    <section className="card p-0">
      <SavedTick show={done} />
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="text-base font-semibold">{table.title}</h3>
          {open && <p className="mt-1 text-xs text-ink/55">Grade: 1 or 2 letters like O, A+, B. Absent: AB, Fail: U.</p>}
        </div>
        <EditControl editable={editable} saved={saved} allowed={allowed} editing={editing} onEdit={() => setEditing(true)} />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead><tr>{['Subject', 'Subject Code', 'Grade'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r._id}>
                <td className="td">{r.subject}</td>
                <td className="td text-ink/70">{r.subjectCode}</td>
                <td className="td">
                  <input aria-label={`${r.subject} grade`} maxLength={2} disabled={!open} className="input w-20 uppercase" value={grades[r._id] || ''}
                    onChange={(e) => setGrades({ ...grades, [r._id]: e.target.value.replace(/[^A-Za-z+]/g, '').toUpperCase() })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 border-t border-ink/10 px-5 py-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`a${table._id}`}>Number of arrears</label>
          <input id={`a${table._id}`} type="number" min="0" disabled={!open} className="input" value={arrears} onChange={(e) => setArrears(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`c${table._id}`}>CGPA</label>
          <input id={`c${table._id}`} inputMode="decimal" maxLength={5} disabled={!open} className="input" value={cgpa} onChange={(e) => setCgpa(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 pb-5">
        {open && <button className="btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save result'}</button>}
        {open && saved && <button className="btn-ghost" disabled={saving} onClick={cancel}>Cancel</button>}
        {!editable && <p className="text-sm text-ink/60">This table is from a former mentor. You can only view it.</p>}
        {err && <span role="alert" className="text-sm text-rose">{err}</span>}
      </div>
    </section>
  );
}