import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, BarChart3, Calculator, Clock3, ShieldCheck } from 'lucide-react';
import { Tools } from './ToolsRebuilt';
import { authApi } from '../services/api';

type PublicSiteProps = { path: string; theme: 'dark' | 'light'; onLogin: () => void };
type ContentPage = { title: string; description: string; heading: string; body: string; sections?: Array<{ title: string; text: string; bullets?: string[] }> };

const pages: Record<string, ContentPage> = {
  '/features': { title: 'Features', description: 'Journal trades, review performance, and monitor risk with GenG Edge.', heading: 'A clearer record of how you trade.', body: 'GenG Edge brings the practical parts of a trading review into one private workspace: capture the execution, understand the result, and build a more consistent process.', sections: [
    { title: 'Trading journal', text: 'Record the details that make a trade review useful instead of leaving them scattered across notes and screenshots.', bullets: ['Entry and exit prices, direction, size, timing, and instrument', 'Stops, targets, strategy, session, setup, emotion, confidence, and discipline', 'Search, filters, editing, deletion, and account-specific trade history'] },
    { title: 'Performance analytics', text: 'Turn stored trade outcomes into readable evidence about your process.', bullets: ['Net P&L, win rate, profit factor, expectancy, average win, and average loss', 'Equity curve, drawdown context, calendar performance, symbols, strategies, and sessions', 'Evidence-based journal review generated from your recorded trades'] },
    { title: 'Funded-account monitoring', text: 'Keep important account rules visible while you review your journal.', bullets: ['Profit targets, daily loss limits, maximum drawdown, trading-day requirements, and consistency rules', 'Static and trailing drawdown support with configurable reset timezones', 'Risk status indicators and optional email alerts for critical or breached states'] },
    { title: 'Independent trading tools', text: 'Use the tools without creating a trade or logging in.', bullets: ['Position sizing based on intended monetary risk, pip value, conversion, and broker lot steps', 'Forex market hours for Sydney, Tokyo, London, New York, and India', 'IANA timezone conversion, daylight-saving handling, overlaps, countdowns, and weekend status'] },
    { title: 'Designed around ownership', text: 'Your private workspace is separated at the API layer, not only hidden in the interface. Authenticated trade and account queries are scoped to the current user, and public pages never include journal records.' },
  ] },
  '/pricing': { title: 'Pricing', description: 'GenG Edge pricing and product information.', heading: 'Start with the tools you need.', body: 'Pricing details are being prepared. The public risk tools are available without an account.' },
  '/faq': { title: 'FAQ', description: 'Answers about the GenG Edge forex journal and tools.', heading: 'Questions, answered plainly.', body: 'GenG Edge provides journaling and analytics functionality. It does not provide financial advice or guarantee trading results.' },
  '/about': { title: 'About', description: 'Learn about GenG Edge, a forex trading journal and tools platform.', heading: 'Built for deliberate review.', body: 'GenG Edge is a focused forex trading journal and trading-tools platform for people who want a clearer record of their decisions, outcomes, and risk process.', sections: [
    { title: 'The problem', text: 'A trade is more useful as learning material when the important context survives the moment it was placed. Spreadsheets can store numbers, but they rarely make review, risk context, and recurring patterns easy to see.' },
    { title: 'The approach', text: 'GenG Edge keeps the workflow direct: record what happened, preserve the context around it, and review the aggregate evidence. The product is designed to support disciplined reflection, not to manufacture certainty or promise an outcome.' },
    { title: 'What belongs here', text: 'The private workspace is intended for personal journal records, account rules, analytics, and process review. The public tools are intentionally independent, so visitors can calculate position risk or inspect reference market hours without creating a trade.' },
    { title: 'A careful product promise', text: 'GenG Edge does not provide financial advice, signals, broker execution, or guaranteed-profit claims. Forex and leveraged trading involve substantial risk. Every calculation is an estimate that should be checked against the user\'s broker, account terms, and own decisions.' },
    { title: 'Technical foundation', text: 'The application uses a React and TypeScript frontend, a FastAPI backend, SQLAlchemy data access, JWT authentication, SQLite for local development, PostgreSQL for production, and Alembic migrations for schema changes.' },
  ] },
  '/contact': { title: 'Contact', description: 'Contact GenG Edge.', heading: 'Contact GenG Edge.', body: 'For product questions, contact support through the address configured for your deployment.' },
  '/terms': { title: 'Terms', description: 'GenG Edge terms of use.', heading: 'Terms of use.', body: 'Use GenG Edge lawfully and keep your account credentials secure. Product functionality may change as the service evolves.' },
  '/privacy': { title: 'Privacy', description: 'GenG Edge privacy information.', heading: 'Privacy matters.', body: 'Private journal data is associated with your authenticated account and is not included in public pages or search indexes.' },
  '/disclaimer': { title: 'Disclaimer', description: 'GenG Edge trading risk disclaimer.', heading: 'Trading risk disclaimer.', body: 'GenG Edge provides tools and journaling/analytics functionality, not financial advice. Forex and leveraged trading involve substantial risk. You are responsible for your own trading decisions.' },
};

function setMetadata(title: string, description: string) {
  document.title = `${title} | GenG Edge`;
  let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!descriptionTag) { descriptionTag = document.createElement('meta'); descriptionTag.name = 'description'; document.head.append(descriptionTag); }
  descriptionTag.content = description;
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = `${window.location.origin}${window.location.pathname}`;
}

export function PublicSite({ path, theme, onLogin }: PublicSiteProps) {
  const toolPath = path === '/tools/forex-market-hours' ? 'hours' : path === '/tools' || path === '/tools/position-size-calculator' ? 'position' : null;
  const page = pages[path];
  useEffect(() => {
    setMetadata(
      toolPath === 'position' ? 'Forex Position Size Calculator' : toolPath === 'hours' ? 'Forex Market Hours' : page?.title ? `GenG Edge ${page.title}` : 'GenG Edge - Forex Trading Journal & Trading Tools',
      toolPath === 'position' ? 'Calculate forex position size, lot size, and risk from account balance and stop loss.' : toolPath === 'hours' ? 'Check Sydney, Tokyo, London, New York, and India forex market hours with DST-aware timezones.' : page?.description ?? 'GenG Edge is a professional forex trading journal with trade analytics, position size calculator, and forex market hours tools.',
    );
  }, [page, toolPath]);

  if (path === '/reset-password') return <LifecyclePage theme={theme} title="Reset your password"><ResetPasswordForm /></LifecyclePage>;
  if (path === '/verify-email') return <LifecyclePage theme={theme} title="Verify your email"><VerifyEmailStatus /></LifecyclePage>;

  if (toolPath) return <main className={`min-h-screen bg-[#05070d] text-slate-100 ${theme === 'light' ? 'theme-light' : ''}`}><div className="mx-auto max-w-6xl px-4 py-8 md:px-8"><PublicNav onLogin={onLogin} /><Tools initialTab={toolPath} /><section className="mt-10 max-w-3xl text-sm leading-7 text-slate-400"><h1 className="text-2xl font-semibold text-white">{toolPath === 'position' ? 'Forex position size calculator' : 'Forex market hours'}</h1><p className="mt-3">Use this independent utility without an account. Results are estimates based on the values you enter and should be checked against your broker specifications. This is not financial advice.</p></section></div></main>;

  return <main className={`min-h-screen bg-[#05070d] text-slate-100 ${theme === 'light' ? 'theme-light' : ''}`}><div className="mx-auto max-w-6xl px-4 py-8 md:px-8"><PublicNav onLogin={onLogin} />{page ? <ContentPageView page={page} /> : <><section className="grid gap-12 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center"><div><div className="text-xs uppercase tracking-[0.3em] text-blue-400">Forex Trading Journal & Trading Tools</div><h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-white md:text-6xl">Trade smarter. Journal better. Improve consistently.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">Record executions, understand your process, and use practical risk tools without exaggerated promises.</p><div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={onLogin} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500">Start Journaling <ArrowRight size={16} /></button><a href="/tools" className="rounded-xl border border-slate-700 px-5 py-3 text-slate-200 hover:border-blue-500">Explore Tools</a></div></div><div className="grid gap-3 sm:grid-cols-2"><Feature Icon={BarChart3} title="Trading Journal" text="Keep a private record of your executions." /><Feature Icon={ShieldCheck} title="Trade Analytics" text="Review outcomes from stored net P&L." /><Feature Icon={Calculator} title="Position Sizing" text="Size risk with broker-aware inputs." /><Feature Icon={Clock3} title="Market Hours" text="Track reference sessions with DST-aware zones." /></div></section><section className="border-t border-slate-800 py-10 text-sm text-slate-500">GenG Edge is for journaling, analytics, and planning. It does not provide financial advice or guarantee profits.</section></>}</div></main>;
}

function LifecyclePage({ theme, title, children }: { theme: 'dark' | 'light'; title: string; children: ReactNode }) {
  return <main className={`min-h-screen bg-[#05070d] px-4 py-8 text-slate-100 ${theme === 'light' ? 'theme-light' : ''}`}><div className="mx-auto max-w-lg"><PublicNav onLogin={() => { window.location.href = '/login'; }} /><section className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/90 p-6"><div className="text-xs uppercase tracking-[0.3em] text-blue-400">GenG Edge account</div><h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>{children}</section></div></main>;
}

function ResetPasswordForm() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); try { const result = await authApi.resetPassword(token, password); setMessage(result.message); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reset password.'); } finally { setSaving(false); } };
  return <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm text-slate-300">New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-blue-500" /></label><button disabled={saving || !token} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Reset password'}</button>{message ? <p className="text-sm text-slate-400">{message}</p> : null}</form>;
}

function VerifyEmailStatus() {
  const [message, setMessage] = useState('Verifying your email...');
  useEffect(() => { const token = new URLSearchParams(window.location.search).get('token'); if (!token) { setMessage('Verification token is missing.'); return; } void authApi.verifyEmail(token).then((result) => setMessage(result.message)).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Unable to verify email.')); }, []);
  return <p className="mt-6 text-sm leading-7 text-slate-400">{message}</p>;
}

function ContentPageView({ page }: { page: ContentPage }) {
  return <section className="py-16 md:py-20"><div className="max-w-3xl"><div className="text-xs uppercase tracking-[0.3em] text-blue-400">GenG Edge</div><h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">{page.heading}</h1><p className="mt-6 text-lg leading-8 text-slate-400">{page.body}</p></div>{page.sections?.length ? <div className="mt-12 grid gap-4 md:grid-cols-2">{page.sections.map((section) => <article key={section.title} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"><h2 className="text-xl font-medium text-white">{section.title}</h2><p className="mt-3 text-sm leading-7 text-slate-400">{section.text}</p>{section.bullets ? <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">{section.bullets.map((bullet) => <li key={bullet} className="border-l-2 border-blue-500/70 pl-3">{bullet}</li>)}</ul> : null}</article>)}</div> : null}</section>;
}

function PublicNav({ onLogin }: { onLogin: () => void }) { return <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5"><a href="/" className="text-lg font-semibold text-white">GenG Edge</a><div className="flex flex-wrap items-center gap-4 text-sm text-slate-400"><a href="/features" className="hover:text-white">Features</a><a href="/tools" className="hover:text-white">Tools</a><a href="/about" className="hover:text-white">About</a><button type="button" onClick={onLogin} className="rounded-lg border border-blue-700/60 px-3 py-2 text-blue-200 hover:bg-blue-950/40">Log in</button></div></nav>; }
function Feature({ Icon, title, text }: { Icon: typeof BarChart3; title: string; text: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"><Icon size={20} className="text-blue-400" /><h2 className="mt-4 font-medium text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>; }
