import { useState } from 'react';
import { LockKeyhole, Mail, MoonStar, Sun, UserRound } from 'lucide-react';

type AuthScreenProps = {
  onSubmit: (payload: { email: string; password: string; fullName: string; mode: 'login' | 'register' }) => Promise<void>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onForgotPassword: (email: string) => Promise<string | void>;
};

export function AuthScreen({ onSubmit, theme, onToggleTheme, onForgotPassword }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'forgot') setNotice((await onForgotPassword(email)) ?? 'If an account exists, reset instructions have been sent.');
      else await onSubmit({ email, password, fullName, mode });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`relative flex min-h-screen items-center justify-center bg-[#05070d] px-4 py-8 text-slate-100 ${theme === 'light' ? 'theme-light' : ''}`}>
      <button type="button" onClick={onToggleTheme} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-blue-500 hover:text-blue-300" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={17} /> : <MoonStar size={17} />}
      </button>
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-blue-950/20 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden flex-col justify-between bg-blue-950/30 p-10 lg:flex">
          <div className="static-ui flex items-center gap-3">
            <img src="/assets/geng-edge-logo.png" alt="GenG Edge logo" className="h-10 w-10 rounded-xl object-contain" />
            <div><span className="text-lg font-semibold">GenG Edge</span><div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Track. Analyze. Improve.</div></div>
          </div>
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-blue-300">Trading performance intelligence</p>
            <h1 className="max-w-md text-4xl font-semibold leading-tight text-white">Turn every trade into a clearer process.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">Securely journal executions, understand your risk, and build a record that belongs only to you.</p>
          </div>
          <p className="text-xs text-slate-500">Your data is isolated by account and protected behind authentication.</p>
        </div>

        <div className="p-6 sm:p-10">
          <div className="static-ui mb-8 lg:hidden"><span className="text-xl font-semibold">GenG Edge</span><div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">Track. Analyze. Improve.</div></div>
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-400">Private workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : 'Create your workspace'}</h2>
            <p className="mt-2 text-sm text-slate-400">{mode === 'login' ? 'Sign in to continue your trading journal.' : mode === 'forgot' ? 'Enter your email and we will send reset instructions if an account exists.' : 'Start with a clean journal. Your dashboard begins empty.'}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' ? (
              <label className="block text-sm text-slate-300">Full name
                <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3"><UserRound size={16} className="text-slate-500" /><input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full bg-transparent py-3 text-white outline-none" placeholder="Your name" /></span>
              </label>
            ) : null}
            <label className="block text-sm text-slate-300">Email
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3"><Mail size={16} className="text-slate-500" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent py-3 text-white outline-none" placeholder="you@example.com" /></span>
            </label>
            {mode !== 'forgot' ? <label className="block text-sm text-slate-300">Password
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3"><LockKeyhole size={16} className="text-slate-500" /><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent py-3 text-white outline-none" placeholder="At least 8 characters" /></span>
            </label> : null}
            {error ? <div className="rounded-xl border border-red-900/70 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</div> : null}
            {notice ? <div className="rounded-xl border border-blue-900/70 bg-blue-950/30 px-3 py-2 text-sm text-blue-200 break-words">{notice}</div> : null}
            <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset instructions' : 'Create account'}</button>
          </form>

          {mode === 'login' ? <button type="button" onClick={() => { setMode('register'); setError(''); setNotice(''); }} className="mt-5 w-full text-sm text-slate-400 hover:text-blue-300">New to GenG Edge? Create an account</button> : <button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); }} className="mt-5 w-full text-sm text-slate-400 hover:text-blue-300">Back to sign in</button>}
          {mode === 'login' ? <button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }} className="mt-3 w-full text-sm text-slate-500 hover:text-blue-300">Forgot password?</button> : null}
        </div>
      </section>
    </main>
  );
}
