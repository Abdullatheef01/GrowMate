import { useEffect, useMemo, useState } from 'react';
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
import SavedTick, { useFlash } from '../components/SavedTick';
import usePaged from '../hooks/usePaged';
import Pagination from '../components/Pagination';
const TABS = ['All', 'Batch', 'Users', 'Mentors', 'Alumni'];
import PasswordMeter from '../components/PasswordMeter';
import { isStrong, personalProblem } from '../utils/password';
import useAction from '../hooks/useAction';
import { SkeletonRows, SkeletonCards, SkeletonView } from '../components/Skeleton';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState(TABS[0]);
  const [menu, setMenu] = useState(false);
  const [stats, setStats] = useState(null);
  const loadStats = () => api.get('/admin/stats').then((r) => setStats(r.data));
  useEffect(() => { loadStats(); }, [tab]);

  const boxes = [
    ['All users', stats?.users, 'bg-brand'], ['Students', stats?.students, 'bg-teal'],
    ['Mentors', stats?.mentors, 'bg-amber'], ['Batches', stats?.batches, 'bg-rose']
  ];

  return (
    <div className="min-h-screen pb-24">
      <Header user={user} onProfile={() => setMenu(true)} />
      {menu && <AdminProfile onClose={() => setMenu(false)} />}
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <h2 className="text-2xl font-semibold">Welcome, Admin</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {boxes.map(([label, n, c]) => (
            <div key={label} className={`${c} rounded-xl p-5 text-white`}>
              <p className="font-display text-3xl font-semibold">{n ?? '-'}</p>
              <p className="mt-1 text-sm text-white/85">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8"><ScrollTabs tabs={TABS} active={tab} onChange={setTab} /></div>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === 'All' && <AllUsers onChanged={loadStats} />}
        {tab === 'Batch' && <Batches onChanged={loadStats} />}
        {tab === 'Users' && <UsersCards />}
        {tab === 'Mentors' && <Mentors />}
        {tab === 'Alumni' && <Alumni />}
      </main>
    </div>
  );
}

function AdminProfile({ onClose }) {
  const { user, logout, refresh } = useAuth();
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [saved, flash] = useFlash();
  const save = async () => {
    setErr('');
    try { await api.put('/auth/admin-credentials', { email, password: password || undefined }); setPassword(''); await refresh(); flash(); }
    catch (e) { setErr(errMsg(e)); }
  };
  return (
    <ProfilePopover onClose={onClose}>
      <SavedTick show={saved} />
      <h3 className="text-base font-semibold">Admin account</h3>
      <label className="label mt-4" htmlFor="ae">Email</label>
      <input id="ae" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="label mt-3" htmlFor="ap">New password</label>
      <input id="ap" type="password" className="input" placeholder="Leave empty to keep the current one" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p role="alert" className="mt-3 text-sm text-rose">{err}</p>}
      <div className="mt-4 flex gap-3"><button className="btn" onClick={save}>Save</button><button className="btn-ghost" onClick={logout}>Log out</button></div>
    </ProfilePopover>
  );
}

const Search = ({ value, onChange, placeholder = 'Search' }) => (
  <input aria-label="Search" className="input mb-5 max-w-md" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
);

/* ---------- All ---------- */
function AllUsers({ onChanged }) {
  const [q, setQ] = useState('');
  const { data, page, setPage, reload, err: loadErr } = usePaged('/admin/users', { search: q, limit: 20 });
  const [view, setView] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'edit' | 'reset' | 'delete', user }
  const [busyId, setBusyId] = useState('');
  const [err, setErr] = useState('');
  const list = data?.items;

  const run = async (id, fn) => {
    if (busyId) return;
    setErr(''); setBusyId(id);
    try { await fn(); reload(); onChanged(); } catch (e) { setErr(errMsg(e)); } finally { setBusyId(''); }
  };
  const flip = (u) => run(u._id, () => api.patch(`/admin/users/${u._id}/role`, { role: u.role === 'student' ? 'mentor' : 'student' }));
  const toggleDisabled = (u) => run(u._id, () => api.patch(`/admin/users/${u._id}/disabled`, { disabled: !u.disabled }));
  const open = async (u) => { setView({ loading: true, name: u.name }); const r = await api.get(`/admin/users/${u._id}/view`); setView({ data: r.data, name: u.name }); };
  const done = () => { setModal(null); reload(); onChanged(); };

  return (
    <div>
      <Search value={q} onChange={setQ} placeholder="Search by name, email or register number" />
      {(err || loadErr) && <p role="alert" className="mb-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err || loadErr}</p>}
      {!list ? <SkeletonRows /> : !list.length ? <Empty title="No users found" /> : (
        <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
          {list.map((u) => (
            <li key={u._id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.disabled ? 'bg-ink/[0.03]' : ''}`}>
              <Avatar user={u} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.name}</p>
                <p className="truncate text-xs text-ink/55">{u.email}</p>
              </div>
              {u.disabled && <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-medium text-ink/70">Disabled</span>}
              <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium capitalize text-brand-dark">{u.role}</span>
              <button className="btn-ghost disabled:opacity-50" disabled={!!busyId} onClick={() => flip(u)}>
                {busyId === u._id ? 'Please wait…' : u.role === 'student' ? 'Make Mentor' : 'Make Student'}
              </button>
              <button className="btn" onClick={() => open(u)}>View</button>
              <RowMenu user={u} busy={busyId === u._id}
                onEdit={() => setModal({ type: 'edit', user: u })}
                onToggle={() => toggleDisabled(u)}
                onReset={() => setModal({ type: 'reset', user: u })}
                onDelete={() => setModal({ type: 'delete', user: u })} />
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}

      {view && (
        <Modal wide title={view.name} onClose={() => setView(null)}>
          {view.loading ? <SkeletonView /> : view.data.type === 'student' ? <StudentView data={view.data} showHistory onToggle={(kind, id, allowed) => api.patch(`/admin/access/${kind}/${id}`, { allowed })} /> : <MentorSummary d={view.data} />}
        </Modal>
      )}
      {modal?.type === 'edit' && <EditUserModal user={modal.user} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'reset' && <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} onDone={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeleteUserModal user={modal.user} onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

function RowMenu({ user, busy, onEdit, onToggle, onReset, onDelete }) {
  const [open, setOpen] = useState(false);
  const item = 'block w-full px-4 py-2 text-left text-sm hover:bg-tint';
  const pick = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative">
      <button className="btn-ghost !px-3 disabled:opacity-50" disabled={busy} aria-label={`More actions for ${user.name}`}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-ink/10 bg-white py-1 shadow-lg">
            <button role="menuitem" className={item} onClick={pick(onEdit)}>Edit details</button>
            <button role="menuitem" className={item} onClick={pick(onToggle)}>{user.disabled ? 'Enable account' : 'Disable account'}</button>
            <button role="menuitem" className={item} onClick={pick(onReset)}>Reset password</button>
            <button role="menuitem" className={`${item} text-rose`} onClick={pick(onDelete)}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onDone }) {
  const [f, setF] = useState(null);
    const [save, saving] = useAction(async () => {
    setErr('');
    try {
      const body = { name: f.name, phone: f.phone, department: f.department };
      if (student) {
        body.registerNumber = f.registerNumber;
        body.profile = { section: f.section, batch: f.batch, yearOfAdmission: f.yearOfAdmission, address: f.address };
      }
      await api.patch(`/admin/users/${user._id}`, body);
      onDone();
    } catch (e) { setErr(errMsg(e)); }
  });
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get(`/admin/users/${user._id}/view`).then((r) => {
      const u = r.data.type === 'student' ? r.data.student : r.data.mentor;
      setF({ name: u.name || '', phone: u.phone || '', department: u.department || '', registerNumber: u.registerNumber || '',
        section: u.profile?.section || '', batch: u.profile?.batch || '', yearOfAdmission: u.profile?.yearOfAdmission || '', address: u.profile?.address || '' });
    }).catch((e) => setErr(errMsg(e)));
  }, [user._id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const student = user.role === 'student';

  return (
    <Modal title={`Edit ${user.name}`} onClose={onClose}>
      {!f ? (err ? <p role="alert" className="text-sm text-rose">{err}</p> : <p className="text-ink/60">Loading…</p>) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Name</label><input className="input" value={f.name} onChange={set('name')} /></div>
            <div><label className="label">Phone</label><input className="input" value={f.phone} onChange={set('phone')} /></div>
            <div><label className="label">Department</label><input className="input" value={f.department} onChange={set('department')} /></div>
            {student && <>
              <div><label className="label">Register number</label><input className="input" value={f.registerNumber} onChange={set('registerNumber')} /></div>
              <div><label className="label">Section</label><input className="input" value={f.section} onChange={set('section')} /></div>
              <div><label className="label">Batch</label><input className="input" value={f.batch} onChange={set('batch')} /></div>
              <div><label className="label">Year of admission</label><input type="number" className="input" value={f.yearOfAdmission} onChange={set('yearOfAdmission')} /></div>
              <div className="sm:col-span-2"><label className="label">Address</label><textarea rows={2} className="input" value={f.address} onChange={set('address')} /></div>
            </>}
          </div>
          <p className="mt-3 text-xs text-ink/55">Email, scores and grades cannot be edited here.</p>
          {err && <p role="alert" className="mt-3 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}
          <div className="mt-5 flex gap-3">
            <button className="btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button className="btn-ghost" disabled={saving} onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const personal = personalProblem(password, user.name, user.email);
  const [saved, flash] = useFlash();
  const save = async () => {
    setErr(''); setSaving(true);
    try { await api.post(`/admin/users/${user._id}/reset-password`, { password }); flash(); setTimeout(onDone, 1600); }
    catch (e) { setErr(errMsg(e)); setSaving(false); }
  };
  return (
    <Modal title={`Reset password for ${user.name}`} onClose={onClose}>
      <SavedTick show={saved} text="Password changed" />
      <p className="text-sm text-ink/60">Set a new password and share it with the user. They can change it later with Forgot password.</p>
      <label className="label mt-4" htmlFor="rp">New password</label>
      <input id="rp" type="text" autoComplete="off" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      <PasswordMeter password={password} />
      {personal && <p className="mt-2 text-sm text-rose">{personal}</p>}
      {err && <p role="alert" className="mt-3 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}
      <button className="btn mt-5" disabled={saving || !isStrong(password) || !!personal} onClick={save}>{saving ? 'Saving…' : 'Set password'}</button>
    </Modal>
  );
}

function DeleteUserModal({ user, onClose, onDone }) {
  const mentor = user.role === 'mentor';
  const [count, setCount] = useState(mentor ? null : 0);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (mentor) api.get(`/admin/users/${user._id}/view`).then((r) => setCount(r.data.studentCount || 0)).catch(() => setCount(0));
  }, [mentor, user._id]);
  const match = name.trim().toLowerCase() === user.name.trim().toLowerCase();

  const remove = async () => {
      const [remove, busy] = useAction(async () => {
    setErr('');
    try { await api.delete(`/admin/users/${user._id}`, { data: { confirmName: name } }); onDone(); }
    catch (e) { setErr(errMsg(e)); }
  });
  };

  return (
    <Modal title={`Delete ${user.name}?`} onClose={onClose}>
      {mentor ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink/80">
          <li>{count === null ? 'Checking students…' : `${count} student${count === 1 ? '' : 's'} will have no mentor until you assign a new one.`}</li>
          <li>The mentor's tables, scores and counselling stay safe. Students still see them.</li>
          <li>Their name will show as "{user.name} (removed)" in past mentors and counselling.</li>
          <li>They will not be able to log in again.</li>
        </ul>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink/80">
          <li>This student and all their scores, grades and counselling will be deleted for good.</li>
          <li>This cannot be undone. If they only left the college, use Disable instead.</li>
        </ul>
      )}
      <label className="label mt-5" htmlFor="dn">Type <b>{user.name}</b> to confirm</label>
      <input id="dn" className="input" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      {err && <p role="alert" className="mt-3 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}
      <div className="mt-5 flex gap-3">
        <button className="btn !bg-rose hover:!bg-rose/90" disabled={!match || busy || count === null} onClick={remove}>{busy ? 'Deleting…' : 'Delete'}</button>
        <button className="btn-ghost" disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function MentorSummary({ d }) {
  const m = d.mentor;
  return (
    <div>
      <div className="flex items-center gap-4"><Avatar user={m} size={64} /><div><p className="font-display text-lg font-semibold">{m.name}</p><p className="text-sm text-ink/60">{m.department || 'No department'}</p></div></div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div><dt className="text-xs text-ink/55">Email</dt><dd className="text-sm">{m.email}</dd></div>
        <div><dt className="text-xs text-ink/55">Phone</dt><dd className="text-sm">{m.phone || '-'}</dd></div>
      </dl>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-amber-soft p-4"><p className="font-display text-2xl font-semibold text-amber">{d.pending}</p><p className="text-sm">Pending counselling</p></div>
        <div className="rounded-xl bg-teal/10 p-4"><p className="font-display text-2xl font-semibold text-teal">{d.completed}</p><p className="text-sm">Completed counselling</p></div>
      </div>
    </div>
  );
}

/* ---------- Batch ---------- */
function Batches({ onChanged }) {
  const { data, page, setPage, reload } = usePaged('/admin/batches', { limit: 10 });
  const [edit, setEdit] = useState(null); // null closed, {} new, batch edit
  const batches = data?.items;
  const del = async (b) => { if (confirm(`Delete batch "${b.name}"? Its students will have no mentor.`)) { await api.delete(`/admin/batches/${b._id}`); reload(); onChanged(); } };

  return (
    <div>
      <button onClick={() => setEdit({})} className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/40 bg-white py-8 font-display font-medium text-brand hover:bg-tint">
        <span className="text-2xl leading-none">+</span> Add Batch
      </button>
      {!batches ? <SkeletonView /> : !batches.length ? <Empty title="No batches yet" hint="Create a batch, add students and assign a mentor." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {batches.map((b) => (
            <article key={b._id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-base font-semibold">{b.name}</h3>
                  <p className="text-sm text-ink/60">Mentor: {b.mentor?.name || <span className="text-amber">Not assigned</span>} · {b.students.length} students</p></div>
                <div className="flex gap-2"><button className="btn-ghost" onClick={() => setEdit(b)}>Edit</button><button className="btn-ghost !text-rose" onClick={() => del(b)}>Delete</button></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">{b.students.map((s) => <span key={s._id} className="flex items-center gap-1.5 rounded-full bg-tint py-1 pl-1 pr-3 text-xs"><Avatar user={s} size={20} />{s.name}</span>)}</div>
            </article>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      {edit && <BatchModal initial={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); onChanged(); }} />}
    </div>
  );
}

function BatchModal({ initial, onClose, onDone }) {
  const [name, setName] = useState(initial.name || '');
  const [selected, setSelected] = useState(initial.students || []);
  const [mentor, setMentor] = useState(initial.mentor?._id || '');
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/admin/mentor-options').then((r) => setMentors(r.data)); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/admin/users', { params: { role: 'student', search: q || undefined, page: 1, limit: 30 } })
        .then((r) => { setList(r.data.items); setPage(1); setMore(r.data.pages > 1); });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const loadMore = async () => {
    const n = page + 1;
    const r = await api.get('/admin/users', { params: { role: 'student', search: q || undefined, page: n, limit: 30 } });
    setList([...list, ...r.data.items]); setPage(n); setMore(n < r.data.pages);
  };

  const ids = selected.map((s) => s._id);
  const toggle = (s) => setSelected(ids.includes(s._id) ? selected.filter((x) => x._id !== s._id) : [...selected, s]);

    const [save, busy] = useAction(async () => {
    setErr('');
    if (!name.trim()) return setErr('Enter a batch name');
    try {
      const payload = { name: name.trim(), students: ids, mentor: mentor || null };
      initial._id ? await api.put(`/admin/batches/${initial._id}`, payload) : await api.post('/admin/batches', payload);
      onDone();
    } catch (e) { setErr(errMsg(e)); }
  });


  return (
    <Modal wide title={initial._id ? 'Edit batch' : 'Add batch'} onClose={onClose}>
      <label className="label" htmlFor="bn">Batch name</label>
      <input id="bn" className="input" placeholder="CSE 2023-2027" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="label mt-4" htmlFor="bm">Mentor</label>
      <select id="bm" className="input" value={mentor} onChange={(e) => setMentor(e.target.value)}>
        <option value="">No mentor yet</option>
        {mentors.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
      </select>

      {!!selected.length && (
        <div className="mt-4">
          <p className="label">In this batch ({selected.length})</p>
          <div className="flex flex-wrap gap-2">{selected.map((s) => (
            <span key={s._id} className="flex items-center gap-2 rounded-full bg-tint py-1 pl-1 pr-2 text-sm">
              <Avatar user={s} size={24} />{s.name}
              <button onClick={() => toggle(s)} aria-label={`Remove ${s.name}`} className="grid h-5 w-5 place-items-center rounded-full text-ink/60 hover:bg-white hover:text-rose">×</button>
            </span>))}</div>
        </div>
      )}

      <label className="label mt-4" htmlFor="bs">Add students</label>
      <input id="bs" className="input" placeholder="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 max-h-60 divide-y divide-ink/10 overflow-y-auto rounded-lg border border-ink/10">
        {list.map((s) => (
          <li key={s._id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-tint">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={ids.includes(s._id)} onChange={() => toggle(s)} />
              <Avatar user={s} size={28} />
              <span className="flex-1 text-sm">{s.name}</span>
              {s.currentBatch && s.currentBatch._id !== initial._id && <span className="text-xs text-amber">Currently in {s.currentBatch.name}</span>}
            </label>
          </li>
        ))}
        {!list.length && <li className="px-3 py-4 text-sm text-ink/55">No students found.</li>}
        {more && <li className="p-2"><button type="button" className="btn-ghost w-full" onClick={loadMore}>Load more</button></li>}
      </ul>

      {err && <p role="alert" className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}
      <button className="btn mt-5" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save batch'}</button>
    </Modal>
  );
}

/* ---------- Users (batch cards) ---------- */
function UsersCards() {
  const [q, setQ] = useState('');
  const { data, page, setPage } = usePaged('/admin/batches', { search: q, limit: 12 });
  const list = data?.items;
  return (
    <div>
      <Search value={q} onChange={setQ} placeholder="Search batch, mentor or student" />
      {!list ? <SkeletonCards n={3}/> : !list.length ? <Empty title="Nothing found" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <article key={b._id} className="rounded-xl bg-tint/70 p-5">
              <h3 className="text-base font-semibold">{b.name}</h3>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink/70">{b.mentor ? <><Avatar user={b.mentor} size={22} />{b.mentor.name}</> : <span className="text-amber">No mentor</span>}</p>
              <ul className="mt-3 space-y-1.5">{b.students.map((st) => <li key={st._id} className="flex items-center gap-2 text-sm"><Avatar user={st} size={22} />{st.name}</li>)}</ul>
            </article>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
    </div>
  );
}

/* ---------- Mentors ---------- */
function Mentors() {
  const [q, setQ] = useState('');
  const { data, page, setPage } = usePaged('/admin/mentors', { search: q, limit: 20 });
  if (!data) return <SkeletonRows />;
  return (
    <div>
      <div className="mb-5 grid max-w-md grid-cols-2 gap-4">
        <div className="rounded-xl bg-teal/10 p-4"><p className="font-display text-2xl font-semibold text-teal">{data.assignedCount}</p><p className="text-sm">Assigned mentors</p></div>
        <div className="rounded-xl bg-amber-soft p-4"><p className="font-display text-2xl font-semibold text-amber">{data.unassignedCount}</p><p className="text-sm">Not assigned</p></div>
      </div>
      <Search value={q} onChange={setQ} placeholder="Search mentors" />
      {!data.items.length ? <Empty title="No mentors found" hint="Use Make Mentor in the All tab to turn a user into a mentor." /> : (
        <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
          {data.items.map((m) => (
            <li key={m._id} className="flex items-center gap-4 px-4 py-3">
              <Avatar user={m} size={44} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.name}</p><p className="text-xs text-ink/55">{m.department || 'No department'} · {m.studentCount} students</p></div>
              {m.assigned ? <span className="rounded-full bg-teal/15 px-3 py-1 text-xs font-medium text-teal">Assigned</span>
                : <span className="rounded-full bg-amber px-3 py-1 text-xs font-medium text-white">Not assigned</span>}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
    </div>
  );
}

/* ---------- Alumni ---------- */
function Alumni() {
  const [groups, setGroups] = useState(null);
  const [sel, setSel] = useState(null);
  useEffect(() => { api.get('/admin/alumni').then((r) => { setGroups(r.data); setSel(r.data[0]?.batch || null); }); }, []);
  if (!groups) return <SkeletonRows n={2} />;
  if (!groups.length) return <Empty title="No alumni yet" hint="Students move here automatically on 1 July of their admission year plus 4." />;
  return (
    <div>
      <div className="no-scrollbar mb-6 flex gap-3 overflow-x-auto">
        {groups.map((x) => (
          <button key={x.batch} onClick={() => setSel(x.batch)} aria-pressed={sel === x.batch}
            className={`shrink-0 rounded-xl px-6 py-3 font-display text-lg font-semibold ${sel === x.batch ? 'bg-brand text-white' : 'bg-white text-brand ring-1 ring-brand/25 hover:bg-tint'}`}>
            {x.batch} <span className="ml-1 text-sm font-normal opacity-70">({x.count})</span>
          </button>
        ))}
      </div>
      {sel && <AlumniList key={sel} batch={sel} />}
    </div>
  );
}

function AlumniList({ batch }) {
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);
  const { data, page, setPage } = usePaged(`/admin/alumni/${batch.split('-')[0]}`, { search: q, limit: 20 });
  const open = async (u) => { setView({ loading: true, name: u.name }); const r = await api.get(`/admin/users/${u._id}/view`); setView({ data: r.data, name: u.name }); };
  return (
    <div>
      <Search value={q} onChange={setQ} placeholder="Search alumni" />
      {!data ? <SkeletonRows /> : !data.items.length ? <Empty title="No students found" /> : (
        <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
          {data.items.map((s) => (
            <li key={s._id} className="flex items-center gap-4 px-4 py-3">
              <Avatar user={s} size={44} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{s.name}</p><p className="text-xs text-ink/55">{s.registerNumber || 'No register number'}</p></div>
              <button className="btn" onClick={() => open(s)}>View</button>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      {view && <Modal wide title={view.name} onClose={() => setView(null)}>{view.loading ? <SkeletonView /> : <StudentView data={view.data} showHistory />}</Modal>}
    </div>
  );
}
