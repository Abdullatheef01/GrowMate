import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import Logo from '../components/Logo';
import PasswordMeter from '../components/PasswordMeter';
import { isStrong } from '../utils/password';

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', registerNumber: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api.post('/auth/register', f);
      nav('/verify', { state: { email: f.email } });
    } catch (e2) { setErr(errMsg(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8"><Logo /></div>
        <h2 className="text-2xl font-semibold">Create your account</h2>
        <p className="mt-1 text-sm text-ink/60">You can add the rest of your details from your profile later.</p>
        {err && <p role="alert" className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}

        <label className="label mt-6" htmlFor="n">Full name</label>
        <input id="n" required className="input" value={f.name} onChange={set('name')} />
        <label className="label mt-4" htmlFor="r">Register number <span className="text-ink/40">(optional)</span></label>
        <input id="r" className="input" value={f.registerNumber} onChange={set('registerNumber')} />
        <label className="label mt-4" htmlFor="e">Email</label>
        <input id="e" type="email" required className="input" value={f.email} onChange={set('email')} />
        <label className="label mt-4" htmlFor="p">Password</label>
        <input id="p" type="password" required minLength={8} className="input" value={f.password} onChange={set('password')} />
        <PasswordMeter password={f.password} />

        <button className="btn mt-6 w-full" disabled={busy || !isStrong(f.password)}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="mt-5 text-center text-sm text-ink/60">Already registered? <Link to="/login" className="font-medium text-brand hover:underline">Log in</Link></p>
      </form>
    </div>
  );
}
