import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import Logo from '../components/Logo';

export default function VerifyEmail() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || '');
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState(state?.email ? `We sent a 6-digit OTP to ${state.email}.` : '');
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(state?.email ? 60 : 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api.post('/auth/verify-email', { email, otp });
      nav('/login', { state: { verified: true } });
    } catch (e2) { setErr(errMsg(e2)); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setErr(''); setMsg('');
    try {
      await api.post('/auth/send-otp', { email, purpose: 'verify' });
      setMsg('A new OTP has been sent. Check your inbox and spam folder.');
      setWait(60);
    } catch (e2) { setErr(errMsg(e2)); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-6 py-12">
      <form onSubmit={verify} className="w-full max-w-sm">
        <div className="mb-8"><Logo /></div>
        <h2 className="text-2xl font-semibold">Verify your email</h2>
        <p className="mt-1 text-sm text-ink/60">Enter the OTP we sent to your email. It is valid for 10 minutes.</p>
        {msg && <p className="mt-4 rounded-lg bg-tint px-3 py-2 text-sm text-brand-dark">{msg}</p>}
        {err && <p role="alert" className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}

        {!state?.email && (<>
          <label className="label mt-6" htmlFor="ve">Email</label>
          <input id="ve" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </>)}
        <label className="label mt-6" htmlFor="vo">OTP</label>
        <input id="vo" required inputMode="numeric" maxLength={6} autoComplete="one-time-code"
          className="input text-center font-display text-xl tracking-[0.5em]" value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />

        <button className="btn mt-6 w-full" disabled={busy || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify'}</button>
        <button type="button" onClick={resend} disabled={wait > 0 || !email} className="btn-ghost mt-3 w-full disabled:opacity-50">
          {wait > 0 ? `Resend OTP in ${wait}s` : 'Resend OTP'}
        </button>
        <p className="mt-5 text-center text-sm text-ink/60"><Link to="/login" className="font-medium text-brand hover:underline">Back to log in</Link></p>
      </form>
    </div>
  );
}