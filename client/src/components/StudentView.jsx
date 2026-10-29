import { useState } from 'react';
import Avatar from './Avatar';
import { mentorName } from '../utils/names';
import { errMsg } from '../api';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '');

function Block({ title, children }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 text-base font-semibold text-brand-dark">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ on, busy, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-brand' : 'bg-ink/25'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

// Read-only view for mentor, admin and alumni screens.
// When onToggle is given, each saved entry gets an "Allow student to edit" switch.
export default function StudentView({ data, showHistory = false, onToggle }) {
  const { student: s, exams = [], semesters = [], counselling = [] } = data;
  const p = s.profile || {};
  const [access, setAccess] = useState(() => Object.fromEntries([...exams, ...semesters].map((d) => [d._id, !!d.editAllowed])));
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const flip = async (kind, d) => {
    if (busy) return;
    setErr(''); setBusy(d._id);
    try {
      const next = !access[d._id];
      await onToggle(kind, d._id, next);
      setAccess((a) => ({ ...a, [d._id]: next }));
    } catch (e) { setErr(errMsg(e)); }
    finally { setBusy(''); }
  };

  const Head = ({ d, kind, extra }) => (
    <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium">{d.table?.title} {extra}</p>
      {onToggle && (
        <label className="flex items-center gap-2 text-xs text-ink/70">
          Allow student to edit
          <Toggle on={!!access[d._id]} busy={busy === d._id} onClick={() => flip(kind, d)} />
        </label>
      )}
    </div>
  );

  const rows = [
    ['Register number', s.registerNumber], ['Department', s.department], ['Section', p.section], ['Batch', p.batch],
    ['Year of admission', p.yearOfAdmission], ['Date of birth', p.dob], ['Gender', p.gender], ['Religion', p.religion],
    ['Community', p.community], ['Nationality', p.nationality], ['Blood group', p.bloodGroup], ['Phone', s.phone],
    ['Email', s.email], ['Aadhar number', p.aadhar], ['Father name', p.fatherName], ['Mother name', p.motherName],
    ['Parent number', p.parentNumber], ['Admission type', p.admissionType], ['Scholarship', p.scholarship], ['Address', p.address]
  ];

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar user={s} size={64} />
        <div>
          <p className="font-display text-lg font-semibold">{s.name}</p>
          <p className="text-sm text-ink/60">Mentor: {s.mentor?.name || 'Not assigned'}</p>
        </div>
      </div>
      {err && <p role="alert" className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}

      <Block title="Profile details">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}><dt className="text-xs text-ink/55">{k}</dt><dd className="text-sm">{v || '-'}</dd></div>
          ))}
        </dl>
      </Block>

      <Block title="Previous academic details">
        {s.previousAcademics?.length ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[480px]">
            <thead><tr>{['School / Degree', 'Institution', 'Year of passing', 'Score %'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{s.previousAcademics.map((a) => <tr key={a._id}><td className="td">{a.level}</td><td className="td">{a.institution}</td><td className="td">{a.yearOfPassing}</td><td className="td">{a.score}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="text-sm text-ink/55">Nothing added yet.</p>}
      </Block>

      <Block title="CIAT / Model exam scores">
        {exams.length ? exams.map((e) => {
          const by = Object.fromEntries((e.scores || []).map((x) => [x.row, x]));
          return (
            <div key={e._id} className="mb-4 overflow-x-auto">
              <Head d={e} kind="exam" />
              <table className="w-full min-w-[480px]">
                <thead><tr>{['Subject', 'Subject Code', 'CIAT 1', 'CIAT 2', 'Model Exam'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>{(e.table?.rows || []).map((r) => <tr key={r._id}><td className="td">{r.subject}</td><td className="td">{r.subjectCode}</td><td className="td">{by[r._id]?.ciat1}</td><td className="td">{by[r._id]?.ciat2}</td><td className="td">{by[r._id]?.model}</td></tr>)}</tbody>
              </table>
            </div>
          );
        }) : <p className="text-sm text-ink/55">No scores entered yet.</p>}
      </Block>

      <Block title="Semester results">
        {semesters.length ? semesters.map((e) => {
          const by = Object.fromEntries((e.grades || []).map((x) => [x.row, x.grade]));
          return (
            <div key={e._id} className="mb-4 overflow-x-auto">
              <Head d={e} kind="semester" extra={<span className="text-ink/55">(Arrears: {e.arrears}, CGPA: {e.cgpa || '-'})</span>} />
              <table className="w-full min-w-[360px]">
                <thead><tr>{['Subject', 'Subject Code', 'Grade'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>{(e.table?.rows || []).map((r) => <tr key={r._id}><td className="td">{r.subject}</td><td className="td">{r.subjectCode}</td><td className="td">{by[r._id]}</td></tr>)}</tbody>
              </table>
            </div>
          );
        }) : <p className="text-sm text-ink/55">No results entered yet.</p>}
      </Block>

      {showHistory && (
        <>
          <Block title="Past mentors">
            {s.pastMentors?.length ? (
              <ul className="space-y-1 text-sm">{s.pastMentors.map((m) => <li key={m._id}>{mentorName(m.mentor)} <span className="text-ink/55">until {fmt(m.to)}</span></li>)}</ul>
            ) : <p className="text-sm text-ink/55">No earlier mentors.</p>}
          </Block>
          <Block title="Counselling history">
            {counselling.length ? (
              <ul className="space-y-3">{counselling.map((c) => (
                <li key={c._id} className="rounded-lg border border-ink/10 p-3">
                  <div className="flex justify-between gap-2"><p className="text-sm font-medium">{c.title}</p>
                    <span className={`text-xs ${c.status === 'accepted' ? 'text-teal' : 'text-amber'}`}>{c.status === 'accepted' ? 'Accepted' : 'Pending'}</span></div>
                  <p className="mt-1 text-sm text-ink/70">{c.description}</p>
                  <p className="mt-1 text-xs text-ink/50">By {mentorName(c.mentor)} on {fmt(c.createdAt)}</p>
                </li>))}</ul>
            ) : <p className="text-sm text-ink/55">No counselling recorded.</p>}
          </Block>
        </>
      )}
    </div>
  );
}