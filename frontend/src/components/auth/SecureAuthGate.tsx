import React from 'react';
import { backendFetch, clearAuthSession, getAccessToken, onAuthChanged, saveAuthSession } from '../../lib/backendApi';

type Mode = 'login' | 'register';
type Step = 'form' | 'otp';

export default function SecureAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = React.useState(() => Boolean(getAccessToken()));
  const [mode, setMode] = React.useState<Mode>('login');
  const [step, setStep] = React.useState<Step>('form');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [challengeId, setChallengeId] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [devOtp, setDevOtp] = React.useState<string | null>(null);

  const [loginForm, setLoginForm] = React.useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = React.useState({
    full_name: '',
    email: '',
    password: '',
    legal_name: '',
    registered_address: '',
    registered_city: '',
    registered_state: '',
    registered_zip: '',
    phone: '',
    dot_number: '',
    mc_number: '',
  });

  const resetOtp = () => {
    setStep('form');
    setChallengeId('');
    setOtpCode('');
    setDevOtp(null);
    setNotice('');
    setError('');
  };

  const startRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await backendFetch('/auth/register/start', {
        method: 'POST',
        body: JSON.stringify(registerForm),
      });
      setChallengeId(result.challenge_id);
      setDevOtp(result.dev_otp || null);
      setNotice(result.message || 'Business verified. Enter the 2-step code.');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const startLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const username = loginForm.email.trim();
      const isDemo = username.toLowerCase() === 'demo' && loginForm.password === 'demo';

      if (isDemo) {
        try {
          const result = await backendFetch('/auth/demo-login', {
            method: 'POST',
            body: JSON.stringify({ username, password: loginForm.password }),
          });
          saveAuthSession(result);
        } catch (demoErr) {
          // Let the UI open even if the backend is not running yet.
          // Backend-powered features like AI chat still need the backend at http://localhost:8081.
          saveAuthSession({
            access_token: 'gridtms-demo-token',
            user: {
              id: 'demo-user',
              email: 'demo@gridtms.local',
              user_metadata: { full_name: 'Demo Dispatcher', legal_name: 'Demo Trucking LLC', demo: true },
            },
          });
        }
        setIsAuthed(true);
        return;
      }

      const result = await backendFetch('/auth/login/start', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });

      if (result.direct_login || result.access_token || result.session?.access_token) {
        saveAuthSession(result);
        setIsAuthed(true);
        return;
      }

      setChallengeId(result.challenge_id);
      setDevOtp(result.dev_otp || null);
      setNotice(result.message || 'Enter the 2-step code.');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const completeOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const path = mode === 'register' ? '/auth/register/complete' : '/auth/login/complete';
      const result = await backendFetch(path, {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: challengeId,
          otp_code: otpCode,
          ...(mode === 'register' ? registerForm : {}),
        }),
      });

      if (mode === 'register') {
        setMode('login');
        setStep('form');
        setNotice(result.message || 'Account created. Now log in to start your secure session.');
        setOtpCode('');
        setDevOtp(null);
      } else {
        saveAuthSession(result);
        setIsAuthed(true);
      }
    } catch (err: any) {
      setError(err.message || 'Code verification failed.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const syncAuthState = () => setIsAuthed(Boolean(getAccessToken()));

    (window as any).gridTmsLogout = () => {
      clearAuthSession();
      setIsAuthed(false);
      resetOtp();
    };

    const unsubscribe = onAuthChanged(syncAuthState);
    syncAuthState();

    return () => {
      unsubscribe();
      delete (window as any).gridTmsLogout;
    };
  }, []);

  if (isAuthed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] rounded-[32px] overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
        <div className="p-10 lg:p-14 bg-gradient-to-br from-[#111827] via-[#0B1220] to-black">
          <div className="mb-8 inline-flex rounded-2xl bg-white px-4 py-2 shadow-xl">
            <img src="/gridtms-logo.svg" alt="GridTMS" className="h-12 w-[180px] object-contain" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-200 mb-8">
            GridTMS Secure Access
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Verified trucking companies only.
          </h1>
          <p className="mt-5 text-slate-300 text-base leading-7 max-w-xl">
            Before an account is created, the backend checks the LLC/legal name, registered business address, DOT number, MC number, and phone against verified carrier records. Login also requires 2-step verification.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">DOT + MC match required</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">LLC/legal name + address checked</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">2-step phone OTP</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">AI chatbot protected by login</div>
          </div>
        </div>

        <div className="p-7 lg:p-9 bg-white text-slate-900">
          <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
            <button
              className={`flex-1 rounded-xl py-2 text-sm font-bold ${mode === 'login' ? 'bg-white shadow text-slate-950' : 'text-slate-500'}`}
              onClick={() => { setMode('login'); resetOtp(); }}
              type="button"
            >
              Login
            </button>
            <button
              className={`flex-1 rounded-xl py-2 text-sm font-bold ${mode === 'register' ? 'bg-white shadow text-slate-950' : 'text-slate-500'}`}
              onClick={() => { setMode('register'); resetOtp(); }}
              type="button"
            >
              Create Account
            </button>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {notice && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>}
          {devOtp && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Local dev OTP: <b>{devOtp}</b></div>}

          {step === 'otp' ? (
            <form onSubmit={completeOtp} className="space-y-4">
              <label className="block text-sm font-bold">2-step verification code</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6-digit code"
                required
              />
              <button disabled={loading} className="w-full rounded-xl bg-orange-500 py-3 font-black text-white hover:bg-orange-600 disabled:opacity-60">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button type="button" onClick={resetOtp} className="w-full rounded-xl border border-slate-200 py-3 font-bold text-slate-600">
                Back
              </button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={startLogin} className="space-y-4">
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" type="text" placeholder="Email or demo username" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              <button disabled={loading} className="w-full rounded-xl bg-slate-950 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-60">
                {loading ? 'Checking...' : 'Login + Send 2-step Code'}
              </button>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">Demo login: username <b>demo</b> / password <b>demo</b>. Demo login skips 2-step verification for local testing only.</div>
            </form>
          ) : (
            <form onSubmit={startRegister} className="space-y-3">
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Your full name" value={registerForm.full_name} onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })} required />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" type="email" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" type="password" placeholder="Password, minimum 8 characters" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} required />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Legal LLC / company name" value={registerForm.legal_name} onChange={(e) => setRegisterForm({ ...registerForm, legal_name: e.target.value })} required />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Registered business street address" value={registerForm.registered_address} onChange={(e) => setRegisterForm({ ...registerForm, registered_address: e.target.value })} required />
              <div className="grid grid-cols-3 gap-3">
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="City" value={registerForm.registered_city} onChange={(e) => setRegisterForm({ ...registerForm, registered_city: e.target.value })} required />
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="State" value={registerForm.registered_state} onChange={(e) => setRegisterForm({ ...registerForm, registered_state: e.target.value })} required />
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="ZIP" value={registerForm.registered_zip} onChange={(e) => setRegisterForm({ ...registerForm, registered_zip: e.target.value })} required />
              </div>
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Phone number" value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="DOT / USDOT number" value={registerForm.dot_number} onChange={(e) => setRegisterForm({ ...registerForm, dot_number: e.target.value })} required />
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="MC number" value={registerForm.mc_number} onChange={(e) => setRegisterForm({ ...registerForm, mc_number: e.target.value })} required />
              </div>
              <button disabled={loading} className="w-full rounded-xl bg-orange-500 py-3 font-black text-white hover:bg-orange-600 disabled:opacity-60">
                {loading ? 'Verifying business...' : 'Verify Business + Send Code'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

