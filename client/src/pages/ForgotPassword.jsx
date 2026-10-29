import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import Logo from '../components/Logo';
import PasswordMeter from '../components/PasswordMeter';
import { isStrong } from '../utils/password';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.post('/auth/send-otp', { email, purpose: 'reset' }); setStep(2); }
    catch (e2) { setErr(errMsg(e2)); }
    finally { setBusy(false); }
  };

  const reset = async (e) => {
    e.preventDefault(); setErr('');
    if (password !== confirm) return setErr('Passwords do not match');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { email, otp, password });
      nav('/login', { state: { reset: true } });
    } catch (e2) { setErr(errMsg(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-6 py-12">
      <form onSubmit={step === 1 ? sendOtp : reset} className="w-full max-w-sm">
        <div className="mb-8"><Logo /></div>
        <h2 className="text-2xl font-semibold">Reset your password</h2>
        <p className="mt-1 text-sm text-ink/60">
          {step === 1 ? 'Enter your registered email. We will send you an OTP.' : `If ${email} is registered, an OTP is on its way. Check your spam folder too.`}
        </p>
        {err && <p role="alert" className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>}

        {step === 1 ? (<>
          <label className="label mt-6" htmlFor="fe">Email</label>
          <input id="fe" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn mt-6 w-full" disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</button>
        </>) : (<>
          <label className="label mt-6" htmlFor="fo">OTP</label>
          <input id="fo" required inputMode="numeric" maxLength={6} autoComplete="one-time-code"
            className="input text-center font-display text-xl tracking-[0.5em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
          <label className="label mt-4" htmlFor="fp">New password</label>
          <input id="fp" type="password" required minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordMeter password={password} />
          <label className="label mt-4" htmlFor="fc">Confirm password</label>
          <input id="fc" type="password" required minLength={6} className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="btn mt-6 w-full" disabled={busy || otp.length !== 6 || !isStrong(password)}>{busy ? 'Saving…' : 'Change password'}</button>
          <button type="button" className="btn-ghost mt-3 w-full" onClick={() => { setStep(1); setOtp(''); }}>Use a different email</button>
        </>)}
        <p className="mt-5 text-center text-sm text-ink/60"><Link to="/login" className="font-medium text-brand hover:underline">Back to log in</Link></p>
      </form>
    </div>
  );
}