import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api';
import Header from '../components/Header';
import ScrollTabs from '../components/ScrollTabs';
import Avatar from '../components/Avatar';
import Empty from '../components/Empty';
import Modal from '../components/Modal';
import Fab from '../components/Fab';
import ProfilePopover from '../components/ProfilePopover';
import StudentView from '../components/StudentView';
import TableBuilder from '../components/TableBuilder';
import SavedTick, { useFlash } from '../components/SavedTick';
import useAction from '../components/../hooks/useAction';
import { SkeletonRows, SkeletonCards, SkeletonView } from '../components/Skeleton';

const TABS = ['Assigned Students', 'Score Table', 'Semester Table', 'Counselling'];
const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function MentorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState(TABS[0]); 
  const [menu, setMenu] = useState(false);
  const [students, setStudents] = useState(null);
  useEffect(() => { api.get('/mentor/students').then((r) => setStudents(r.data)); }, []);

  return (
    <div className="min-h-screen pb-24">
      <Header user={user} onProfile={() => setMenu(true)} />
      <ScrollTabs tabs={TABS} active={tab} onChange={setTab} />
      {menu && <MentorProfile onClose={() => setMenu(false)} />}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-semibold">Welcome, {user.name}</h2>
        <div className="mt-6">
          {tab === TABS[0] && <Students students={students} />}
         {tab === TABS[1] && <TableBuilder kind="exam" canCreate={!!students?.length} />}
        {tab === TABS[2] && <TableBuilder kind="semester" canCreate={!!students?.length} />}
          {tab === TABS[3] && <MentorCounselling students={students || []} />}
        </div>
      </main>
    </div>
  );
}

function MentorProfile({ onClose }) {
  const { user, logout, refresh } = useAuth();
  const [f, setF] = useState({ name: user.name || '', department: user.department || '', phone: user.phone || '' });
  const [saved, flash] = useFlash();
  const [err, setErr] = useState('');
  const fileRef = useRef();
  const save = async () => { try { await api.put('/mentor/me', f); await refresh(); flash(); } catch (e) { setErr(errMsg(e)); } };
  const upload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('photo', file);
    try { await api.post('/upload/photo', fd); await refresh(); } catch (e2) { setErr(errMsg(e2)); }
  };
  return (
    <ProfilePopover onClose={onClose}>
      <SavedTick show={saved} />
      <div className="flex items-center gap-3">
        <Avatar user={user} size={56} />
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
          <button className="text-sm font-medium text-brand hover:underline" onClick={() => fileRef.current.click()}>Change photo</button>
        </div>
      </div>
      <label className="label mt-4">Name</label>
      <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <label className="label mt-3">Department</label>
      <input className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} />
      <label className="label mt-3">Phone</label>
      <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <label className="label mt-3">Email <span className="text-ink/40">(cannot be changed)</span></label>
      <input className="input" disabled value={user.email} />
      {err && <p role="alert" className="mt-3 text-sm text-rose">{err}</p>}
      <div className="mt-4 flex gap-3"><button className="btn" onClick={save}>Save</button><button className="btn-ghost" onClick={logout}>Log out</button></div>
    </ProfilePopover>
  );
}

function Students({ students }) {
  const [view, setView] = useState(null);
  const open = async (s) => { setView({ loading: true, name: s.name }); const r = await api.get(`/mentor/students/${s._id}`); setView({ data: r.data, name: s.name, id: s._id }); };
  if (!students) return <SkeletonRows />;
  if (!students.length) return <Empty title="No students assigned yet" hint="Students appear here once the admin assigns them to you." />;
  return (
    <>
      <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
        {students.map((s) => (
          <li key={s._id} className="flex items-center gap-4 px-4 py-3">
            <Avatar user={s} size={44} />
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{s.name}</p><p className="text-xs text-ink/55">{s.registerNumber || 'No register number'}</p></div>
            <button className="btn-ghost" onClick={() => open(s)}>View</button>
          </li>
        ))}
      </ul>
      {view && <Modal wide title={view.name} onClose={() => setView(null)}>{view.loading ? <SkeletonView /> : <StudentView data={view.data} onToggle={(kind, id, allowed) => api.patch(`/mentor/students/${view.id}/access/${kind}/${id}`, { allowed })} />}</Modal>}
    </>
  );
}

function MentorCounselling({ students }) {
  const [filter, setFilter] = useState('All');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get('/mentor/counselling', { params: { status: filter === 'All' ? undefined : filter.toLowerCase() } }).then((r) => setList(r.data));
  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  return (
    <div>
      <div className="mb-5 flex gap-2" role="tablist">
        {['All', 'Accepted', 'Pending'].map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 font-display text-sm font-medium ${filter === f ? 'bg-brand text-white' : 'bg-white text-brand ring-1 ring-brand/25 hover:bg-tint'}`}>{f}</button>
        ))}
      </div>
      {!list ? <SkeletonCards /> : !list.length ? (
        <Empty title={filter === 'All' ? 'No counselling recorded yet' : `Nothing ${filter.toLowerCase()}`} hint="Tap the + button to record a counselling session for a student." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <article key={c._id} className="card">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold">{c.title}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === 'accepted' ? 'bg-teal/15 text-teal' : 'bg-amber-soft text-amber'}`}>{c.status === 'accepted' ? 'Accepted' : 'Pending'}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-ink/75">{c.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-ink/55"><Avatar user={c.student} size={22} />{c.student?.name} on {fmt(c.createdAt)}</div>
            </article>
          ))}
        </div>
      )}
      <Fab label="Record counselling" onClick={() => setOpen(true)} />
      {open && <CounsellingModal students={students} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function CounsellingModal({ students, onClose, onDone }) {
  const [f, setF] = useState({ title: '', description: '', student: '' });
  const [now, setNow] = useState(new Date());
  const [err, setErr] = useState('');
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const [submit, busy] = useAction(async () => {
    setErr('');
    try { await api.post('/mentor/counselling', f); onDone(); }
    catch (e) { setErr(errMsg(e)); }
  });

  return (
    <Modal title="Record counselling" onClose={onClose}>
      <label className="label" htmlFor="ct">Title</label>
      <input id="ct" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label className="label mt-4" htmlFor="cd">Description</label>
      <textarea id="cd" rows={4} className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <label className="label mt-4" htmlFor="cs">Student</label>
      <select id="cs" className="input" value={f.student} onChange={(e) => setF({ ...f, student: e.target.value })}>
        <option value="">Select a student</option>
        {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
      <label className="label mt-4">Date and time</label>
      <input className="input" disabled value={fmt(now)} />
      <p className="mt-1 text-xs text-ink/50">Recorded automatically when you press Done.</p>
      {err && <p role="alert" className="mt-3 text-sm text-rose">{err}</p>}
      <button className="btn mt-5" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Done'}</button>
    </Modal>
  );
}