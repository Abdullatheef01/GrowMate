import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import SavedTick, { useFlash } from '../components/SavedTick';

const ADMISSION = ['Counselling', 'Management', '7.5', 'PMSS', 'SC/ST'];
const PROFILE_FIELDS = [
  ['section', 'Section'], ['batch', 'Batch'], ['yearOfAdmission', 'Year of admission', 'number'],
  ['dob', 'Date of birth', 'date'], ['gender', 'Gender'], ['religion', 'Religion'], ['community', 'Community'],
  ['nationality', 'Nationality'], ['bloodGroup', 'Blood group'], ['aadhar', 'Aadhar number'],
  ['fatherName', 'Father name'], ['motherName', 'Mother name'], ['parentNumber', 'Parent number']
];

// A brand new student has nothing saved yet, so the page opens directly in edit mode
const hasSavedData = (u) =>
  !!(u.department || u.phone || (u.previousAcademics || []).length ||
    Object.values(u.profile || {}).some((v) => v !== '' && v != null));

const fromUser = (u) => ({
  name: u.name || '', phone: u.phone || '', department: u.department || '',
  registerNumber: u.registerNumber || '',
  profile: { ...(u.profile || {}) },
  previousAcademics: (u.previousAcademics || []).map(({ level, institution, yearOfPassing, score }) => ({ level, institution, yearOfPassing, score }))
});

export default function StudentProfile() {
  const { user, refresh } = useAuth();
  const [f, setF] = useState(() => fromUser(user));
  const [editing, setEditing] = useState(() => !hasSavedData(user));
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(''); // '' | 'up' | 'del'
  const [saved, flash] = useFlash();
  const [err, setErr] = useState('');
  const [photoErr, setPhotoErr] = useState('');
  const fileRef = useRef();

  const setP = (k) => (e) => setF({ ...f, profile: { ...f.profile, [k]: e.target.value } });
  const setA = (i, k, v) => setF({ ...f, previousAcademics: f.previousAcademics.map((a, j) => (j === i ? { ...a, [k]: v } : a)) });

  const save = async (e) => {
    e.preventDefault();
    if (!editing || saving) return;
    setErr(''); setSaving(true);
    try {
      await api.put('/student/profile', f);         // wait until the database has it
      const fresh = await refresh();                 // then reload the saved data
      if (fresh) setF(fromUser(fresh));
      setEditing(false);
      flash();                                       // tick only after everything finished
    } catch (e2) { setErr(errMsg(e2)); }
    finally { setSaving(false); }
  };

  const cancel = () => { setF(fromUser(user)); setErr(''); setEditing(false); };

  const upload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoErr(''); setPhotoBusy('up');
    try {
      const fd = new FormData(); fd.append('photo', file);
      await api.post('/upload/photo', fd);
      await refresh();
    } catch (e2) { setPhotoErr(errMsg(e2)); }
    finally { setPhotoBusy(''); }
  };

  const removePhoto = async () => {
    if (!confirm('Remove your profile photo?')) return;
    setPhotoErr(''); setPhotoBusy('del');
    try { await api.delete('/upload/photo'); await refresh(); }
    catch (e2) { setPhotoErr(errMsg(e2)); }
    finally { setPhotoBusy(''); }
  };

  return (
    <div className="min-h-screen">
      <SavedTick show={saved} />
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo />
          <Link to="/student" className="btn-ghost">Back to dashboard</Link>
        </div>
      </header>

      <form onSubmit={save} className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Photo + Edit button (photo buttons work right away, they do not need Save changes) */}
        <section className="card flex flex-wrap items-center gap-5">
          <Avatar user={user} size={88} />
          <div>
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-ghost disabled:opacity-50" disabled={!!photoBusy} onClick={() => fileRef.current.click()}>
                {photoBusy === 'up' ? 'Uploading…' : 'Change photo'}
              </button>
              {user.photo && (
                <button type="button" className="btn-ghost !border-rose/30 !text-rose disabled:opacity-50" disabled={!!photoBusy} onClick={removePhoto}>
                  {photoBusy === 'del' ? 'Removing…' : 'Delete photo'}
                </button>
              )}
            </div>
            {photoErr && <p role="alert" className="mt-2 text-sm text-rose">{photoErr}</p>}
          </div>
          {!editing && (
            <button type="button" className="btn ml-auto" onClick={() => setEditing(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
              Edit
            </button>
          )}
        </section>

        {/* Everything inside this fieldset is locked until Edit is clicked */}
        <fieldset disabled={!editing || saving} className="min-w-0 space-y-6">
          <section className="card">
            <h2 className="mb-4 text-base font-semibold">Personal details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="Register number" hint={user.registerNumberEdited ? 'Locked. It can be changed only once.' : 'You can change this only once.'}>
                <input className="input" disabled={user.registerNumberEdited} value={f.registerNumber} onChange={(e) => setF({ ...f, registerNumber: e.target.value })} />
              </Field>
              <Field label="Department"><input className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field>
              {PROFILE_FIELDS.map(([k, label, type]) => (
                <Field key={k} label={label} hint={k === 'aadhar' ? 'For your safety, only the last 4 digits are saved.' : undefined}>
                  <input type={type || 'text'} maxLength={k === 'aadhar' ? 14 : undefined} className="input" value={f.profile[k] ?? ''} onChange={setP(k)} />
                </Field>
              ))}
              <Field label="Phone number"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
              <Field label="Email" hint="Email cannot be changed."><input className="input" disabled value={user.email} /></Field>
              <div className="sm:col-span-2">
                <Field label="Address"><textarea rows={2} className="input" value={f.profile.address ?? ''} onChange={setP('address')} /></Field>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Previous academic details</h2>
              {editing && (
                <button type="button" className="btn-ghost" onClick={() => setF({ ...f, previousAcademics: [...f.previousAcademics, { level: '', institution: '', yearOfPassing: '', score: '' }] })}>Add row</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead><tr>{['School / Degree', 'Institution', 'Year of passing', 'Score %', ''].map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
                <tbody>
                  {f.previousAcademics.map((a, i) => (
                    <tr key={i}>
                      {['level', 'institution', 'yearOfPassing', 'score'].map((k) => (
                        <td key={k} className="td"><input aria-label={k} className="input" value={a[k] || ''} onChange={(e) => setA(i, k, e.target.value)} /></td>
                      ))}
                      <td className="td">
                        {editing && <button type="button" className="text-sm text-rose hover:underline" onClick={() => setF({ ...f, previousAcademics: f.previousAcademics.filter((_, j) => j !== i) })}>Remove</button>}
                      </td>
                    </tr>
                  ))}
                  {!f.previousAcademics.length && <tr><td className="td text-ink/55" colSpan={5}>{editing ? 'No rows yet. Add your 10th, 12th or diploma details.' : 'Nothing added yet.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card grid gap-4 sm:grid-cols-2">
            <Field label="Admission type">
              <select className="input" value={f.profile.admissionType || ''} onChange={setP('admissionType')}>
                <option value="">Select</option>
                {ADMISSION.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Scholarship"><input className="input" placeholder={editing ? 'Name of the scholarship, if any' : ''} value={f.profile.scholarship ?? ''} onChange={setP('scholarship')} /></Field>
          </section>
        </fieldset>

        {err && <p role="alert" className="rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}

        {editing && (
          <div className="flex gap-3">
            <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            {hasSavedData(user) && <button type="button" className="btn-ghost disabled:opacity-50" disabled={saving} onClick={cancel}>Cancel</button>}
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}