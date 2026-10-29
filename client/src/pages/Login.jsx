import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
import Logo from '../components/Logo';

const home = { student: '/student', mentor: '/mentor', admin: '/admin' };

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await login(form.email, form.password);
      nav(home[u.role], { replace: true });
    } catch (e2) {
  if (e2.response?.data?.needsVerify) return nav('/verify', { state: { email: form.email } });
  setErr(errMsg(e2));
}
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-brand p-12 text-white lg:flex">
        <Logo light />
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Every semester, a little further than the last.</h1>
          <p className="mt-4 max-w-md text-white/75">Track counselling, exam scores and results with your mentor in one place.</p>
        </div>
        <p className="text-sm text-white/60">GrowMate student mentoring platform</p>
      
      </aside>

      <main className="grid place-items-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-semibold">Log in</h2>
          <p className="mt-1 text-sm text-ink/60">Use the email and password you registered with.</p>
          {new URLSearchParams(window.location.search).get('expired') && (
            <p className="mt-4 rounded-lg bg-amber-soft px-3 py-2 text-sm text-ink">Your session ended. Please log in again.</p>
          )}
          {state?.verified && <p className="mt-4 rounded-lg bg-tint px-3 py-2 text-sm text-brand-dark">Email verified. Log in to continue.</p>}
          {state?.reset && <p className="mt-4 rounded-lg bg-tint px-3 py-2 text-sm text-brand-dark">Password changed. Log in with your new password.</p>}
          {err && <p role="alert" className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}

          <label className="label mt-6" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="label mt-4" htmlFor="pw">Password</label>
          <input id="pw" type="password" required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="mt-2 text-right"><Link to="/forgot" className="text-sm font-medium text-brand hover:underline">Forgot password?</Link></div>

          <button className="btn mt-6 w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          <p className="mt-5 text-center text-sm text-ink/60">New here? <Link to="/register" className="font-medium text-brand hover:underline">Create an account</Link></p>
        </form>
      </main>
    </div>
  );
  
}
