import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Pencil,
  Trash2,
  Filter,
  LineChart,
  MoonStar,
  Search,
  ShieldCheck,
  Sun,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AuthScreen } from './components/AuthScreen';
import { Tools } from './components/ToolsRebuilt';
import { PublicSite } from './components/PublicSite';
import { accountsApi, authApi, fundedAnalyticsApi, journalAnalyticsApi, type Account, type AiReport, type AuthUser, type FundedAnalytics, type JournalCalendar, type JournalStats, tradesApi, type ApiTrade, usersApi } from './services/api';

type Direction = 'Long' | 'Short';
type Trade = {
  id: number;
  date: string;
  symbol: string;
  direction: Direction;
  entry: number;
  exit: number;
  size: number;
  strategy: string;
  session: string;
  pnl: number;
  rr: number;
  entryTime: string;
  exitTime: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

type Stat = {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
};

type ViewName = 'Dashboard' | 'Trades' | 'Analytics' | 'Calendar' | 'AI Report' | 'Strategies' | 'Risk' | 'Tools' | 'Settings';

const initialTrades: Trade[] = [];
const instrumentSuggestions = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'XAUUSD', 'XAGUSD', 'NAS100', 'US30', 'SPX500', 'BTCUSD', 'ETHUSD'];

function getTradeMarketData(symbol: string, entry: number, exit: number, accountCurrency: string) {
  const normalized = symbol.replace(/[^A-Za-z]/g, '').toUpperCase();
  const contractSize = normalized.startsWith('XAUUSD') ? 100 : normalized.startsWith('XAGUSD') ? 5000 : normalized.startsWith('NAS100') || normalized.startsWith('US30') || normalized.startsWith('SPX500') || normalized.startsWith('BTCUSD') || normalized.startsWith('ETHUSD') ? 1 : 100000;
  const quoteCurrency = normalized.length >= 6 ? normalized.slice(3, 6) : accountCurrency;
  const baseCurrency = normalized.length >= 6 ? normalized.slice(0, 3) : '';
  const quoteToAccountRate = quoteCurrency === accountCurrency ? 1 : baseCurrency === accountCurrency && exit > 0 ? 1 / exit : 1;
  return { contract_size: contractSize, quote_currency: quoteCurrency, account_currency: accountCurrency, quote_to_account_rate: quoteToAccountRate, asset_class: contractSize === 100000 ? 'forex' : 'contract' };
}

function mapApiTrade(trade: ApiTrade): Trade {
  return {
    id: trade.id,
    date: trade.entry_time.slice(0, 10),
    symbol: trade.symbol,
    direction: trade.direction === 'LONG' ? 'Long' : 'Short',
    entry: trade.entry_price,
    exit: trade.exit_price,
    size: trade.quantity,
    strategy: trade.strategy ?? 'Unassigned',
    session: trade.session ?? 'Unassigned',
    pnl: trade.net_pnl,
    rr: trade.risk_reward_ratio,
    entryTime: trade.entry_time,
    exitTime: trade.exit_time,
    stopLoss: trade.stop_loss,
    takeProfit: trade.take_profit,
  };
}

const navItems: Array<{ label: ViewName; Icon: LucideIcon }> = [
  { label: 'Dashboard', Icon: LineChart },
  { label: 'Trades', Icon: BriefcaseBusiness },
  { label: 'Analytics', Icon: TrendingUp },
  { label: 'Calendar', Icon: Wallet },
  { label: 'AI Report', Icon: FileText },
  { label: 'Strategies', Icon: BarChart3 },
  { label: 'Risk', Icon: ShieldCheck },
  { label: 'Tools', Icon: Wrench },
  { label: 'Settings', Icon: MoonStar },
];

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

function getPnlTone(value: number) {
  if (value > 0) return 'text-blue-400';
  if (value < 0) return 'text-red-400';
  return 'text-slate-300';
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  return { date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 16) };
}

function MetricCard({ title, value, trend, tone }: { title: string; value: string; trend?: string; tone: 'positive' | 'negative' | 'neutral' }) {
  const toneClass = tone === 'positive' ? 'text-blue-400' : tone === 'negative' ? 'text-red-400' : 'text-slate-300';
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm shadow-slate-950/20">
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{title}</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
        {trend ? (
          <span className={toneClass}>{trend}</span>
        ) : null}
      </div>
    </div>
  );
}

function displayMoney(value: number | null | undefined) {
  return value === null || value === undefined ? 'N/A' : formatCurrency(value);
}

function StatsPanel({ stats }: { stats: JournalStats | null }) {
  if (!stats) return <EmptyWorkspace onAddTrade={() => undefined} />;
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-blue-900/60 bg-blue-950/20 p-5"><div className="text-xs uppercase tracking-[0.22em] text-blue-300">Your Stats · Last 30 Days</div><div className="mt-1 text-sm text-slate-400">{stats.start_date} to {stats.end_date}</div></div>{[['Total trades', String(stats.total_trades)], ['Win rate', `${stats.win_rate}%`], ['Net P&L', displayMoney(stats.net_profit)], ['Profit factor', stats.profit_factor === null ? 'N/A' : String(stats.profit_factor)], ['Avg win', displayMoney(stats.average_win)], ['Avg loss', displayMoney(stats.average_loss)], ['Best trade', displayMoney(stats.best_trade)], ['Worst trade', displayMoney(stats.worst_trade)], ['Trading days', String(stats.trading_days)], ['Best symbol', stats.best_symbol?.name ?? 'N/A'], ['Worst symbol', stats.worst_symbol?.name ?? 'N/A'], ['Best session', stats.best_session?.name ?? 'N/A']].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"><div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</div><div className={`mt-3 text-xl font-semibold ${label.includes('P&L') || label.includes('win') || label.includes('loss') || label.includes('trade') ? getPnlTone(Number(value.replace('$', '')) || 0) : 'text-white'}`}>{value}</div></div>)}</section>;
}

function MonthlyCalendar({ data, onPrevious, onNext }: { data: JournalCalendar | null; onPrevious?: () => void; onNext?: () => void }) {
  if (!data) return <EmptyWorkspace onAddTrade={() => undefined} />;
  const firstDay = new Date(data.year, data.month - 1, 1).getDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells = [...Array(mondayOffset).fill(null), ...data.daily];
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.22em] text-slate-400">Monthly P&L</div><h3 className="mt-1 text-xl font-semibold text-white">{new Date(data.year, data.month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3></div><div className="flex items-center gap-4"><button type="button" onClick={onPrevious} className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 hover:border-blue-600">Previous</button><button type="button" onClick={onNext} className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 hover:border-blue-600">Next</button><div className="text-right"><div className={`text-2xl font-semibold ${getPnlTone(data.monthly_pnl)}`}>{formatCurrency(data.monthly_pnl)}</div><div className="text-xs text-slate-400">{data.trading_days} trading days</div></div></div></div><div className="mt-5 grid grid-cols-7 gap-2 text-center text-[10px] uppercase tracking-wider text-slate-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day}>{day}</div>)}{cells.map((day, index) => day ? <div key={day.date} className={`min-h-20 rounded-xl border p-2 text-left ${day.pnl > 0 ? 'border-blue-900/70 bg-blue-950/30' : day.pnl < 0 ? 'border-red-900/70 bg-red-950/20' : 'border-slate-800 bg-slate-950/40'}`}><div className="text-xs text-slate-400">{new Date(`${day.date}T00:00:00`).getDate()}</div><div className={`mt-2 text-xs font-semibold ${getPnlTone(day.pnl)}`}>{formatCurrency(day.pnl)}</div><div className="mt-1 text-[10px] text-slate-500">{day.trades} trades</div></div> : <div key={`blank-${index}`} className="min-h-20 rounded-xl border border-transparent" />)}</div><div className="mt-5 flex flex-wrap gap-3"><div className="text-xs uppercase tracking-wider text-slate-500">Weekly P&L</div>{data.weekly.map((week) => <div key={week.week} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">W{week.week}: <span className={getPnlTone(week.pnl)}>{formatCurrency(week.pnl)}</span></div>)}</div></section>;
}

function LegacyAiReportPanel({ report }: { report: AiReport | null }) {
  if (!report || !report.data_available) return <EmptyWorkspace onAddTrade={() => undefined} />;
  return <section className="space-y-4"><div className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-5"><div className="text-xs uppercase tracking-[0.22em] text-blue-300">AI Report</div><h3 className="mt-2 text-xl font-semibold text-white">Evidence-based performance review</h3><p className="mt-3 text-sm text-slate-300">{report.summary.total_trades} trades · {report.summary.winning_trades} wins · {report.summary.losing_trades} losses · Net P&L {formatCurrency(report.summary.net_profit)}</p></div><div className="grid gap-4 md:grid-cols-3">{[['Best pair', report.best_symbol?.name], ['Worst pair', report.worst_symbol?.name], ['Best strategy', report.best_strategy?.name], ['Worst strategy', report.worst_strategy?.name], ['Best session', report.best_session?.name], ['Weakest session', report.weakest_session?.name]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div><div className="mt-3 text-lg font-semibold text-white">{value ?? 'N/A'}</div></div>)}</div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Key observations</div><div className="mt-4 space-y-3">{report.observations.length ? report.observations.map((item) => <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200">{item}</div>) : <div className="text-sm text-slate-400">No negative pattern detected from available data.</div>}</div></div><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Suggestions</div><div className="mt-4 space-y-3">{report.recommendations.map((item) => <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200">{item}</div>)}</div></div></div></section>;
}

function AiReportPanel({ report }: { report: AiReport | null }) {
  if (!report || !report.data_available) return <EmptyWorkspace onAddTrade={() => undefined} />;
  const quality = report.quality;
  const score = (value: number | null) => value === null ? 'N/A' : `${value.toFixed(0)}/100`;
  const leaders = [['Best symbol', report.best_symbol?.name], ['Worst symbol', report.worst_symbol?.name], ['Best strategy', report.best_strategy?.name], ['Weakest strategy', report.worst_strategy?.name], ['Best session', report.best_session?.name], ['Weakest session', report.weakest_session?.name], ['Best direction', report.best_direction?.name], ['Weakest direction', report.worst_direction?.name]];
  return <section className="space-y-4">
    <div className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-5"><div className="text-xs uppercase tracking-[0.22em] text-blue-300">AI Report</div><h3 className="mt-2 text-xl font-semibold text-white">Evidence-based performance review</h3><p className="mt-3 text-sm text-slate-300">{report.summary.total_trades} trades · {report.summary.winning_trades} wins · {report.summary.losing_trades} losses · Net P&amp;L {formatCurrency(report.summary.net_profit)}</p><p className="mt-3 text-xs text-slate-500">{report.analysis_method}</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard title="Confidence" value={score(quality.average_confidence)} tone={quality.average_confidence !== null && quality.average_confidence < 60 ? 'negative' : 'neutral'} /><MetricCard title="Discipline" value={score(quality.average_discipline)} tone={quality.average_discipline !== null && quality.average_discipline < 60 ? 'negative' : 'neutral'} /><MetricCard title="TLC score" value={score(quality.average_tlc)} tone={quality.average_tlc < 60 ? 'negative' : 'positive'} /><MetricCard title="Max loss streak" value={`${report.streaks.max_loss_streak} trades`} tone={report.streaks.max_loss_streak >= 3 ? 'negative' : 'neutral'} /></div>
    <div className="grid gap-4 md:grid-cols-4">{leaders.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div><div className="mt-3 text-lg font-semibold text-white">{value ?? 'N/A'}</div></div>)}</div>
    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk and data quality</div><div className="mt-4 space-y-3">{report.risk_flags.length ? report.risk_flags.map((item) => <div key={item} className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-200">{item}</div>) : <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3 text-sm text-emerald-200">No major risk-recording gaps detected.</div>}<div className="text-xs text-slate-500">Missing stops: {quality.trades_without_stop} · Missing targets: {quality.trades_without_target} · Best streak: {report.streaks.max_win_streak}</div></div></div><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Key observations</div><div className="mt-4 space-y-3">{report.observations.length ? report.observations.map((item) => <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200">{item}</div>) : <div className="text-sm text-slate-400">No strong negative pattern detected yet.</div>}</div></div></div>
    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent daily breakdown</div><div className="mt-4 space-y-2">{report.daily_breakdown.slice().reverse().map((day) => <div key={day.date} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"><span className="text-slate-400">{day.date} · {day.total_trades} trades</span><span className={getPnlTone(day.net_profit)}>{formatCurrency(day.net_profit)} · {day.win_rate}% wins</span></div>)}</div></div><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Action plan</div><div className="mt-4 space-y-3">{report.recommendations.map((item) => <div key={item} className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-3 text-sm text-slate-200">{item}</div>)}</div></div></div>
  </section>;
}

function WorkspaceView({ view, theme, trades, metrics, account, fundedAnalytics, journalStats, calendarData, aiReport, onAddTrade, onEditTrade, onDeleteTrade, onAccountSaved, onCalendarPrevious, onCalendarNext }: { view: ViewName; theme: 'dark' | 'light'; trades: Trade[]; metrics: ReturnType<typeof getWorkspaceMetrics>; account: Account | null; fundedAnalytics: FundedAnalytics | null; journalStats: JournalStats | null; calendarData: JournalCalendar | null; aiReport: AiReport | null; onAddTrade: () => void; onEditTrade: (trade: Trade) => void; onDeleteTrade: (trade: Trade) => void; onAccountSaved: (account: Account) => void; onCalendarPrevious: () => void; onCalendarNext: () => void }) {
  const pageCopy: Record<ViewName, { eyebrow: string; title: string; description: string }> = {
    Dashboard: { eyebrow: 'Overview', title: 'Dashboard', description: 'Your live performance command center.' },
    Trades: { eyebrow: 'Journal', title: 'Trade history', description: 'Search, inspect, and review every execution.' },
    Analytics: { eyebrow: 'Performance intelligence', title: 'Analytics', description: 'Understand what is driving your outcomes.' },
    Calendar: { eyebrow: 'Consistency', title: 'Trading calendar', description: 'See your rhythm, streaks, and daily results.' },
    'AI Report': { eyebrow: 'Evidence-based review', title: 'AI Report', description: 'A concise review generated only from your stored journal trades.' },
    Strategies: { eyebrow: 'Playbook', title: 'Strategies', description: 'Compare the ideas and setups behind your trades.' },
    Risk: { eyebrow: 'Capital protection', title: 'Risk management', description: 'Keep position risk and account limits visible.' },
    Tools: { eyebrow: 'Professional toolkit', title: 'Tools', description: 'Calculate position risk and monitor global forex sessions.' },
    Settings: { eyebrow: 'Workspace', title: 'Settings', description: 'Configure your account and trading preferences.' },
  };
  const copy = pageCopy[view];
  const groupedStrategies = Object.entries(trades.reduce<Record<string, number>>((groups, trade) => {
    groups[trade.strategy] = (groups[trade.strategy] ?? 0) + trade.pnl;
    return groups;
  }, {}));
  const sessionPerformance = ['Asian', 'London', 'New York'].map((session) => {
    const values = trades.filter((trade) => trade.session === session);
    const pnl = values.reduce((sum, trade) => sum + trade.pnl, 0);
    const wins = values.filter((trade) => trade.pnl > 0).length;
    return { session, trades: values.length, pnl, winRate: values.length ? wins / values.length * 100 : 0 };
  });
  const bestSession = sessionPerformance.filter((item) => item.trades > 0).sort((a, b) => b.pnl - a.pnl)[0];
  const worstSession = sessionPerformance.filter((item) => item.trades > 0).sort((a, b) => a.pnl - b.pnl)[0];

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><div className="text-[10px] uppercase tracking-[0.3em] text-blue-400">{copy.eyebrow}</div><h2 className="mt-2 text-3xl font-semibold text-white">{copy.title}</h2><p className="mt-2 text-sm text-slate-400">{copy.description}</p></div>
        <button type="button" onClick={onAddTrade} className="w-fit rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">+ Add Trade</button>
      </div>

      {view === 'Settings' && account ? <FundedAccountSettings account={account} onSaved={onAccountSaved} /> : null}
      {view === 'Settings' ? <NotificationSettingsPanel /> : null}
      {view === 'Tools' ? <Tools theme={theme} /> : null}

      {view === 'Trades' ? <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"><div className="mb-4 flex items-center justify-between"><div className="text-sm text-slate-400">{trades.length} executions in {account?.name ?? 'your account'}</div><button type="button" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Export CSV</button></div>{trades.length === 0 ? <EmptyWorkspace onAddTrade={onAddTrade} /> : <TradeTable trades={trades} onEditTrade={onEditTrade} onDeleteTrade={onDeleteTrade} />}</div> : null}

      {view === 'Analytics' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metrics.cards.slice(0, 4).map((card) => <MetricCard key={card.label} title={card.label} value={card.value} tone={card.tone} trend={trades.length ? 'Live' : undefined} />)}<div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:col-span-2"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Long vs Short</div><div className="mt-5 grid grid-cols-2 gap-3">{['Long', 'Short'].map((direction) => { const subset = trades.filter((trade) => trade.direction === direction); const pnl = subset.reduce((sum, trade) => sum + trade.pnl, 0); return <div key={direction} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-sm text-slate-400">{direction}</div><div className="mt-2 text-2xl font-semibold text-white">{subset.length}</div><div className={getPnlTone(pnl)}>{formatCurrency(pnl)}</div></div>; })}</div></div><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:col-span-2"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Session and execution quality</div><div className="mt-5 space-y-3">{['London', 'New York', 'Asian'].map((session) => { const values = trades.filter((trade) => trade.session === session); const pnl = values.reduce((sum, trade) => sum + trade.pnl, 0); return <div key={session} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"><span className="text-slate-300">{session}</span><span className="text-slate-100">{values.length} trades · <span className={getPnlTone(pnl)}>{formatCurrency(pnl)}</span></span></div>; })}</div></div></div> : null}
      {view === 'Analytics' ? <StatsPanel stats={journalStats} /> : null}
      {view === 'Analytics' ? <div className="grid gap-4 md:grid-cols-3">{sessionPerformance.map((item) => <div key={item.session} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.session}</div><div className={`mt-3 text-2xl font-semibold ${getPnlTone(item.pnl)}`}>{formatCurrency(item.pnl)}</div><div className="mt-2 text-sm text-slate-400">{item.trades} trades · {item.winRate.toFixed(1)}% win rate</div></div>)}<div className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-5 md:col-span-3"><div className="text-xs uppercase tracking-[0.2em] text-blue-300">Session insights</div><div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200">Best session: {bestSession ? `${bestSession.session} at ${formatCurrency(bestSession.pnl)} with ${bestSession.winRate.toFixed(1)}% wins.` : 'Not enough data yet.'}</div><div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200">Weakest session: {worstSession ? `${worstSession.session} at ${formatCurrency(worstSession.pnl)}. Review entries and execution there.` : 'Not enough data yet.'}</div></div></div></div> : null}

      {view === 'Calendar' ? <MonthlyCalendar data={calendarData} onPrevious={onCalendarPrevious} onNext={onCalendarNext} /> : null}

      {view === 'AI Report' ? <AiReportPanel report={aiReport} /> : null}

      {view === 'Strategies' ? <div className="grid gap-4 md:grid-cols-2">{groupedStrategies.length ? groupedStrategies.map(([strategy, pnl]) => <div key={strategy} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="text-lg font-medium text-white">{strategy}</div><div className={`mt-3 text-2xl font-semibold ${getPnlTone(pnl)}`}>{formatCurrency(pnl)}</div><div className="mt-2 text-sm text-slate-400">{trades.filter((trade) => trade.strategy === strategy).length} linked trades</div></div>) : <EmptyWorkspace onAddTrade={onAddTrade} />}</div> : null}

      {view === 'Risk' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{fundedAnalytics ? <><MetricCard title="Starting balance" value={formatCurrency(fundedAnalytics.account.starting_balance)} tone="neutral" /><MetricCard title="Current equity" value={formatCurrency(fundedAnalytics.account.equity)} tone={fundedAnalytics.account.equity >= fundedAnalytics.account.starting_balance ? 'positive' : 'negative'} /><MetricCard title="Daily loss remaining" value={fundedAnalytics.risk.daily_loss_remaining === null ? 'DATA UNAVAILABLE' : formatCurrency(fundedAnalytics.risk.daily_loss_remaining)} tone={fundedAnalytics.risk.daily_status === 'SAFE' ? 'positive' : 'negative'} /><MetricCard title="Drawdown remaining" value={fundedAnalytics.account.drawdown_remaining === null ? 'DATA UNAVAILABLE' : formatCurrency(fundedAnalytics.account.drawdown_remaining)} tone={fundedAnalytics.risk.drawdown_status === 'SAFE' ? 'positive' : 'negative'} /><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:col-span-2 xl:col-span-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Funded account status</div><div className="mt-2 text-2xl font-semibold text-white">{fundedAnalytics.risk.overall_status}</div></div><div className="text-right text-sm text-slate-400">{fundedAnalytics.trading_days.count} trading days · minimum {fundedAnalytics.trading_days.minimum}</div></div><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">Profit target: {fundedAnalytics.account.profit_target === null ? 'DATA UNAVAILABLE' : `${formatCurrency(fundedAnalytics.account.profit_target)} · ${fundedAnalytics.account.profit_progress_percent ?? 0}% progress`}</div><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">Daily loss: {fundedAnalytics.risk.daily_status} · {fundedAnalytics.risk.daily_loss_usage_percent === null ? 'DATA UNAVAILABLE' : `${fundedAnalytics.risk.daily_loss_usage_percent}% used`}</div><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">Reconciliation: {fundedAnalytics.account.reconciliation_difference === 0 ? 'MATCHED' : `${formatCurrency(fundedAnalytics.account.reconciliation_difference)} difference`}</div></div></div><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:col-span-2 xl:col-span-4"><div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">Daily performance</div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-500"><tr>{['Date', 'Starting', 'Net P&L', 'Ending', 'Trades', 'Wins', 'Losses', 'Status'].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody>{fundedAnalytics.daily_performance.map((row) => <tr key={row.date} className="border-t border-slate-800"><td className="px-3 py-3">{row.date}</td><td className="px-3 py-3">{formatCurrency(row.starting_balance)}</td><td className={`px-3 py-3 ${getPnlTone(row.net_pnl)}`}>{formatCurrency(row.net_pnl)}</td><td className="px-3 py-3">{formatCurrency(row.ending_balance)}</td><td className="px-3 py-3">{row.trades}</td><td className="px-3 py-3">{row.wins}</td><td className="px-3 py-3">{row.losses}</td><td className="px-3 py-3">{row.status}</td></tr>)}</tbody></table></div></div></> : <EmptyWorkspace onAddTrade={onAddTrade} />}</div> : null}

      {view === 'Settings' ? <div className="max-w-3xl space-y-4"><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-400">Account profile</div><div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-300">Workspace name<input defaultValue={account?.name ?? 'Primary Account'} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label><label className="text-sm text-slate-300">Broker<input defaultValue={account?.broker ?? ''} placeholder="Legion Funding" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label><label className="text-sm text-slate-300">Account type<select defaultValue={account?.account_type ?? 'Funded'} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"><option>Funded</option><option>Evaluation</option><option>Live</option><option>Demo</option></select></label><label className="text-sm text-slate-300">Currency<select defaultValue={account?.currency ?? 'USD'} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"><option>USD</option><option>EUR</option><option>GBP</option></select></label></div></div><div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-400">Prop-firm guardrails</div><div className="grid gap-4 md:grid-cols-3">{['Initial balance', 'Profit target', 'Daily loss limit', 'Maximum drawdown', 'Risk per trade', 'Timezone'].map((field) => <label key={field} className="text-sm text-slate-300">{field}<input placeholder={field === 'Timezone' ? 'UTC' : '0.00'} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>)}</div><button type="button" className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Save preferences</button></div></div> : null}

      {view === 'Calendar' && trades.length === 0 ? <EmptyWorkspace onAddTrade={onAddTrade} /> : null}
    </section>
  );
}

function EmptyWorkspace({ onAddTrade }: { onAddTrade: () => void }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center"><div className="text-lg font-medium text-white">No data yet</div><p className="mt-2 text-sm text-slate-400">Add a trade and this view will start building from your own records.</p><button type="button" onClick={onAddTrade} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">+ Add Trade</button></div>;
}

function FundedAccountSettings({ account, onSaved }: { account: Account; onSaved: (account: Account) => void }) {
  const [form, setForm] = useState({ name: account.name, broker: account.broker ?? '', account_type: account.account_type ?? 'Funded', initial_balance: String(account.initial_balance ?? 0), current_balance: String(account.current_balance ?? 0), profit_target: '', profit_target_type: 'percentage', daily_loss_limit: '', daily_loss_limit_type: 'percentage', max_drawdown: '', max_drawdown_type: 'percentage', minimum_trading_days: String(account.minimum_trading_days ?? 0), daily_loss_calculation_method: 'closed_trades_only', daily_reset_timezone: 'UTC', drawdown_type: 'static' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const save = async () => {
    setSaving(true);
    try {
      const saved = await accountsApi.update(localStorage.getItem('gengedge_token') ?? '', account.id, { ...account, ...form, initial_balance: Number(form.initial_balance), current_balance: Number(form.current_balance), profit_target: form.profit_target ? Number(form.profit_target) : null, profit_target_type: form.profit_target_type, daily_loss_limit: form.daily_loss_limit ? Number(form.daily_loss_limit) : null, daily_loss_limit_type: form.daily_loss_limit_type, max_drawdown: form.max_drawdown ? Number(form.max_drawdown) : null, max_drawdown_type: form.max_drawdown_type, minimum_trading_days: Number(form.minimum_trading_days), daily_loss_calculation_method: form.daily_loss_calculation_method, daily_reset_timezone: form.daily_reset_timezone, drawdown_type: form.drawdown_type });
      onSaved(saved);
      setMessage('Funded account rules saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save rules.');
    } finally { setSaving(false); }
  };
  return <div className="mb-6 rounded-2xl border border-blue-900/60 bg-blue-950/20 p-5"><div className="mb-4"><div className="text-xs uppercase tracking-[0.2em] text-blue-300">Funded Account</div><h3 className="mt-1 text-xl font-semibold text-white">Configure rule compliance</h3><p className="mt-1 text-sm text-slate-400">All dashboard values will be reconstructed from this account and stored trade net P&amp;L.</p></div><div className="grid gap-4 md:grid-cols-3"><label className="text-sm text-slate-300">Account name<input value={form.name} onChange={(event) => update('name', event.target.value)} className="field" /></label><label className="text-sm text-slate-300">Broker<input value={form.broker} onChange={(event) => update('broker', event.target.value)} placeholder="Legion Funding" className="field" /></label><label className="text-sm text-slate-300">Account type<select value={form.account_type} onChange={(event) => update('account_type', event.target.value)} className="field"><option>Funded</option><option>Challenge</option><option>Evaluation</option><option>Personal</option></select></label><label className="text-sm text-slate-300">Starting balance<input type="number" value={form.initial_balance} onChange={(event) => update('initial_balance', event.target.value)} className="field" /></label><label className="text-sm text-slate-300">Recorded current balance<input type="number" value={form.current_balance} onChange={(event) => update('current_balance', event.target.value)} className="field" /></label><label className="text-sm text-slate-300">Minimum trading days<input type="number" min="0" value={form.minimum_trading_days} onChange={(event) => update('minimum_trading_days', event.target.value)} className="field" /></label><RuleInput label="Profit target" value={form.profit_target} type={form.profit_target_type} onValue={(value) => update('profit_target', value)} onType={(value) => update('profit_target_type', value)} /><RuleInput label="Daily loss limit" value={form.daily_loss_limit} type={form.daily_loss_limit_type} onValue={(value) => update('daily_loss_limit', value)} onType={(value) => update('daily_loss_limit_type', value)} /><RuleInput label="Maximum drawdown" value={form.max_drawdown} type={form.max_drawdown_type} onValue={(value) => update('max_drawdown', value)} onType={(value) => update('max_drawdown_type', value)} /><label className="text-sm text-slate-300">Daily loss method<select value={form.daily_loss_calculation_method} onChange={(event) => update('daily_loss_calculation_method', event.target.value)} className="field"><option value="closed_trades_only">Closed trades only</option><option value="balance_based">Balance based</option><option value="equity_based">Equity based</option></select></label><label className="text-sm text-slate-300">Reset timezone<input value={form.daily_reset_timezone} onChange={(event) => update('daily_reset_timezone', event.target.value)} placeholder="Europe/London" className="field" /></label><label className="text-sm text-slate-300">Drawdown type<select value={form.drawdown_type} onChange={(event) => update('drawdown_type', event.target.value)} className="field"><option value="static">Static</option><option value="trailing">Trailing</option></select></label></div><div className="mt-5 flex items-center gap-3"><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60">{saving ? 'Saving...' : 'Save funded rules'}</button>{message ? <span className="text-sm text-slate-300">{message}</span> : null}</div></div>;
}

function NotificationSettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('gengedge_token');
    if (token) void usersApi.notificationSettings(token).then((settings) => { setEnabled(settings.email_enabled); setEmail(settings.notification_email ?? ''); });
  }, []);
  const save = async () => {
    const token = localStorage.getItem('gengedge_token');
    if (!token) return;
    try {
      await usersApi.updateNotificationSettings(token, { email_enabled: enabled, notification_email: email || null });
      setMessage('Email notification settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save email settings.');
    }
  };
  const sendTest = async () => {
    const token = localStorage.getItem('gengedge_token');
    if (!token) return;
    try {
      const result = await usersApi.sendTestEmail(token);
      setMessage(result.sent ? 'Test email sent.' : (result.reason ?? 'Test email could not be sent.'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send test email.');
    }
  };
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5"><div className="mb-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Email notifications</div><h3 className="mt-1 text-xl font-semibold text-white">Stay ahead of risk</h3><p className="mt-1 text-sm text-slate-400">Receive risk breach, drawdown, critical alert, and summary emails.</p></div><div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-end"><label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 accent-blue-600" />Enable email alerts</label><label className="text-sm text-slate-300">Notification email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label><div className="flex gap-2"><button type="button" onClick={() => void save()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Save alerts</button><button type="button" onClick={() => void sendTest()} disabled={!enabled || !email} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50">Send test</button></div></div>{message ? <div className="mt-3 text-sm text-slate-400">{message}</div> : null}</div>;
}

function RuleInput({ label, value, type, onValue, onType }: { label: string; value: string; type: string; onValue: (value: string) => void; onType: (value: string) => void }) {
  return <label className="text-sm text-slate-300">{label}<div className="mt-1 flex gap-2"><input type="number" min="0" value={value} onChange={(event) => onValue(event.target.value)} className="field mt-0" /><select value={type} onChange={(event) => onType(event.target.value)} className="field mt-0 w-28"><option value="percentage">%</option><option value="fixed">$ fixed</option></select></div></label>;
}

function TradeTable({ trades, onEditTrade, onDeleteTrade }: { trades: Trade[]; onEditTrade: (trade: Trade) => void; onDeleteTrade: (trade: Trade) => void }) {
  return <div className="overflow-x-auto"><table className="min-w-full border-separate border-spacing-y-2 text-left text-sm"><thead className="text-slate-400"><tr>{['Date', 'Symbol', 'Direction', 'Entry', 'Exit', 'Size', 'Strategy', 'Session', 'P&L', 'R:R', 'Actions'].map((heading) => <th key={heading} className="px-3 py-2 font-medium">{heading}</th>)}</tr></thead><tbody>{trades.map((trade) => <tr key={trade.id} className="bg-slate-950/60 text-slate-200"><td className="px-3 py-3">{trade.date}</td><td className="px-3 py-3 font-medium text-white">{trade.symbol}</td><td className={`px-3 py-3 ${trade.direction === 'Long' ? 'text-emerald-400' : 'text-red-400'}`}>{trade.direction}</td><td className="px-3 py-3">{trade.entry}</td><td className="px-3 py-3">{trade.exit}</td><td className="px-3 py-3">{trade.size}</td><td className="px-3 py-3">{trade.strategy}</td><td className="px-3 py-3">{trade.session}</td><td className={`px-3 py-3 font-medium ${getPnlTone(trade.pnl)}`}>{formatCurrency(trade.pnl)}</td><td className="px-3 py-3">{trade.rr.toFixed(1)}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><button type="button" onClick={() => onEditTrade(trade)} title="Edit trade" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-blue-600 hover:text-blue-300"><Pencil size={14} /></button><button type="button" onClick={() => onDeleteTrade(trade)} title="Delete trade" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-red-600 hover:text-red-300"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>;
}

function getWorkspaceMetrics(trades: Trade[]) {
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const losses = trades.filter((trade) => trade.pnl < 0);
  const grossProfit = trades.filter((trade) => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  return { totalPnl, cards: [{ label: 'Total P&L', value: formatCurrency(totalPnl), tone: totalPnl >= 0 ? 'positive' as const : 'negative' as const }, { label: 'Win Rate', value: trades.length ? `${(wins / trades.length * 100).toFixed(1)}%` : '0.0%', tone: 'positive' as const }, { label: 'Profit Factor', value: grossLoss ? (grossProfit / grossLoss).toFixed(2) : '0.00', tone: grossProfit >= grossLoss ? 'positive' as const : 'negative' as const }, { label: 'Expectancy', value: formatCurrency(trades.length ? totalPnl / trades.length : 0), tone: totalPnl >= 0 ? 'positive' as const : 'negative' as const }] };
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('gengedge_theme') as 'dark' | 'light' | null) ?? 'dark');
  const [token, setToken] = useState(() => localStorage.getItem('gengedge_token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [fundedAnalytics, setFundedAnalytics] = useState<FundedAnalytics | null>(null);
  const [journalStats, setJournalStats] = useState<JournalStats | null>(null);
  const [calendarData, setCalendarData] = useState<JournalCalendar | null>(null);
  const [aiReport, setAiReport] = useState<AiReport | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [activeView, setActiveView] = useState<ViewName>('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(Boolean(token));
  const [workspaceError, setWorkspaceError] = useState('');
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [tradeActionError, setTradeActionError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('All symbols');
  const [filterDirection, setFilterDirection] = useState('All directions');
  const [filterSession, setFilterSession] = useState('All sessions');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [tradeForm, setTradeForm] = useState({
    symbol: 'EURUSD',
    direction: 'Long' as Direction,
    entry: '1.0848',
    exit: '1.0886',
    size: '1.2',
    strategy: 'EMA + Price Action',
    session: 'London',
    entryDate: new Date().toISOString().slice(0, 10),
    entryTime: '09:00',
    exitDate: new Date().toISOString().slice(0, 10),
    exitTime: '10:00',
    stopLoss: '',
    takeProfit: '',
  });

  useEffect(() => {
    localStorage.setItem('gengedge_theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!token) {
      setLoadingWorkspace(false);
      return;
    }

    const loadWorkspace = async () => {
      try {
        const currentUser = await authApi.me(token);
        const accounts = await accountsApi.list(token);
        const currentAccount = accounts[0] ?? await accountsApi.create(token);
        const serverTrades = await tradesApi.list(token);
        const funded = await fundedAnalyticsApi.get(token, currentAccount.id);
        const [stats, report] = await Promise.all([journalAnalyticsApi.last30(token), journalAnalyticsApi.report(token)]);
        const currentDate = new Date();
        const month = await journalAnalyticsApi.calendar(token, currentDate.getFullYear(), currentDate.getMonth() + 1);
        setUser(currentUser);
        setAccount(currentAccount);
        setTrades(serverTrades.map(mapApiTrade));
        setFundedAnalytics(funded);
        setJournalStats(stats);
        setAiReport(report);
        setCalendarData(month);
      } catch (error) {
        localStorage.removeItem('gengedge_token');
        setToken(null);
        setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspace');
      } finally {
        setLoadingWorkspace(false);
      }
    };

    void loadWorkspace();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void journalAnalyticsApi.calendar(token, calendarMonth.getFullYear(), calendarMonth.getMonth() + 1).then(setCalendarData);
  }, [calendarMonth, token]);

  const refreshJournalAnalytics = async () => {
    if (!token) return;
    const [stats, report, month] = await Promise.all([journalAnalyticsApi.last30(token), journalAnalyticsApi.report(token), journalAnalyticsApi.calendar(token, calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)]);
    setJournalStats(stats);
    setAiReport(report);
    setCalendarData(month);
  };

  const authenticate = async ({ email, password, fullName, mode }: { email: string; password: string; fullName: string; mode: 'login' | 'register' }) => {
    const response = mode === 'login'
      ? await authApi.login(email, password)
      : await authApi.register(email, password, fullName);
    localStorage.setItem('gengedge_token', response.access_token);
    setUser(response.user);
    setToken(response.access_token);
    setLoadingWorkspace(true);
  };

  const totalPnl = useMemo(() => trades.reduce((sum, trade) => sum + trade.pnl, 0), [trades]);
  const filteredTrades = useMemo(() => trades.filter((trade) => {
    const query = searchQuery.trim().toLowerCase();
    return (!query || `${trade.symbol} ${trade.strategy} ${trade.session}`.toLowerCase().includes(query))
      && (filterSymbol === 'All symbols' || trade.symbol === filterSymbol)
      && (filterDirection === 'All directions' || trade.direction === filterDirection)
      && (filterSession === 'All sessions' || trade.session === filterSession)
      && (!filterFrom || trade.date >= filterFrom)
      && (!filterTo || trade.date <= filterTo);
  }), [filterDirection, filterFrom, filterSession, filterSymbol, filterTo, searchQuery, trades]);
  const winRate = useMemo(() => {
    const wins = filteredTrades.filter((trade) => trade.pnl > 0).length;
    return filteredTrades.length ? `${((wins / filteredTrades.length) * 100).toFixed(1)}%` : '0.0%';
  }, [filteredTrades]);
  const derivedMetrics = useMemo(() => {
    const winners = filteredTrades.filter((trade) => trade.pnl > 0);
    const losers = filteredTrades.filter((trade) => trade.pnl < 0);
    const grossProfit = winners.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0));
    const profitFactor = grossLoss ? grossProfit / grossLoss : 0;
    const filteredTotalPnl = filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const expectancy = filteredTrades.length ? filteredTotalPnl / filteredTrades.length : 0;
    const startingBalance = account?.initial_balance ?? 0;
    const equity = filteredTrades.slice().reverse().reduce<{ date: string; value: number; pnl: number }[]>((points, trade) => {
      const previous = points[points.length - 1]?.value ?? 0;
      points.push({ date: trade.date, value: Number((previous + trade.pnl).toFixed(2)), pnl: trade.pnl });
      return points;
    }, [{ date: 'Start', value: 0, pnl: 0 }]);
    let peak = 0;
    let maxDrawdown = 0;
    equity.forEach((point) => {
      peak = Math.max(peak, point.value);
      maxDrawdown = Math.max(maxDrawdown, peak - point.value);
    });
    const currentEquity = equity.length ? equity[equity.length - 1].value : 0;
    const returnPercent = startingBalance ? (currentEquity - startingBalance) / startingBalance * 100 : 0;
    const bestTrade = Math.max(...filteredTrades.map((trade) => trade.pnl), 0);
    const worstTrade = Math.min(...filteredTrades.map((trade) => trade.pnl), 0);
    const aggregate = (key: 'session' | 'symbol') => Object.entries(
      filteredTrades.reduce<Record<string, number>>((groups, trade) => {
        const name = trade[key];
        groups[name] = (groups[name] ?? 0) + trade.pnl;
        return groups;
      }, {}),
    ).map(([name, pnl]) => ({ name, pnl: Number(pnl.toFixed(2)) }));
    const sessions = aggregate('session');
    const symbols = aggregate('symbol').sort((a, b) => b.pnl - a.pnl);
    const strongestSession = sessions.slice().sort((a, b) => b.pnl - a.pnl)[0];
    return {
      cards: [
        { label: 'Total P&L', value: formatCurrency(filteredTotalPnl), tone: filteredTotalPnl >= 0 ? 'positive' : 'negative' as const },
        { label: 'Realized', value: formatCurrency(filteredTotalPnl), tone: filteredTotalPnl >= 0 ? 'positive' : 'negative' as const },
        { label: 'Open P&L', value: formatCurrency(0), tone: 'neutral' as const },
        { label: 'Win Rate', value: filteredTrades.length ? `${(winners.length / filteredTrades.length * 100).toFixed(1)}%` : '0.0%', tone: 'positive' as const },
        { label: 'Profit Factor', value: profitFactor.toFixed(2), tone: profitFactor >= 1 ? 'positive' : 'negative' as const },
        { label: 'Expectancy', value: formatCurrency(expectancy), tone: expectancy >= 0 ? 'positive' : 'negative' as const },
      ] satisfies Stat[],
      equity,
      startingBalance,
      currentEquity,
      returnPercent,
      maxDrawdown,
      bestTrade,
      worstTrade,
      sessions,
      symbols,
      recent: filteredTrades.slice(0, 4),
      insights: strongestSession ? [
        `${strongestSession.name} is your strongest session at ${formatCurrency(strongestSession.pnl)}.`,
        `${winners.length} winners and ${losers.length} losses are producing a ${filteredTrades.length ? (winners.length / filteredTrades.length * 100).toFixed(1) : '0.0'}% win rate.`,
        `${filteredTrades.length ? (filteredTotalPnl / filteredTrades.length >= 0 ? 'Average trade is positive.' : 'Average trade is negative.') : 'Add trades to unlock process insights.'}`,
      ] : [],
    };
  }, [account?.initial_balance, filteredTrades]);
  const workspaceMetrics = useMemo(() => getWorkspaceMetrics(filteredTrades), [filteredTrades]);
  const tradePreview = useMemo(() => {
    const entry = Number(tradeForm.entry);
    const exit = Number(tradeForm.exit);
    const size = Number(tradeForm.size);
    const marketData = getTradeMarketData(tradeForm.symbol, entry, exit, account?.currency ?? 'USD');
    const priceMove = tradeForm.direction === 'Long' ? exit - entry : entry - exit;
    return { pnl: priceMove * size * marketData.contract_size * marketData.quote_to_account_rate, contractSize: marketData.contract_size };
  }, [account?.currency, tradeForm.direction, tradeForm.entry, tradeForm.exit, tradeForm.size, tradeForm.symbol]);
  const chartColors = theme === 'dark'
    ? { grid: '#1e1e1e', axis: '#71717a', tooltipBackground: '#0b0b0b', tooltipBorder: '#252525', area: '#0088ff', areaShadow: '#06315c', bar: '#0088ff' }
    : { grid: '#dbe4f0', axis: '#64748b', tooltipBackground: '#ffffff', tooltipBorder: '#cbd5e1', area: '#2563eb', areaShadow: '#dbeafe', bar: '#2563eb' };

  const publicPath = window.location.pathname.replace(/\/$/, '') || '/';
  const isAuthPath = ['/login', '/signup', '/forgot-password'].includes(publicPath);
  if (!token || !user) {
    if (isAuthPath) return <AuthScreen onSubmit={authenticate} onForgotPassword={async (email) => (await authApi.forgotPassword(email)).development_reset_url} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />;
    return <PublicSite path={publicPath} theme={theme} onLogin={() => { window.location.href = '/login'; }} />;
  }

  if (loadingWorkspace) {
    return <main className={`flex min-h-screen items-center justify-center bg-[#05070d] text-sm text-slate-400 ${theme === 'light' ? 'theme-light' : ''}`}>Loading your private workspace...</main>;
  }

  const handleTradeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !account) return;

    const entryDateTime = new Date(`${tradeForm.entryDate}T${tradeForm.entryTime}`).toISOString();
    const exitDateTime = new Date(`${tradeForm.exitDate}T${tradeForm.exitTime}`).toISOString();
    const payload = {
      account_id: account.id,
      symbol: tradeForm.symbol.toUpperCase(),
      direction: tradeForm.direction.toUpperCase(),
      quantity: Number(tradeForm.size),
      entry_price: Number(tradeForm.entry),
      exit_price: Number(tradeForm.exit),
      entry_time: entryDateTime,
      exit_time: exitDateTime,
      stop_loss: tradeForm.stopLoss ? Number(tradeForm.stopLoss) : null,
      take_profit: tradeForm.takeProfit ? Number(tradeForm.takeProfit) : null,
      strategy: tradeForm.strategy,
      session: tradeForm.session,
      market_data: getTradeMarketData(tradeForm.symbol, Number(tradeForm.entry), Number(tradeForm.exit), account.currency),
    };

    try {
      const savedTrade = editingTrade
        ? await tradesApi.update(token, editingTrade.id, payload)
        : await tradesApi.create(token, payload);
      setTrades((current) => editingTrade ? current.map((trade) => trade.id === editingTrade.id ? mapApiTrade(savedTrade) : trade) : [mapApiTrade(savedTrade), ...current]);
      setFundedAnalytics(await fundedAnalyticsApi.get(token, account.id));
      await refreshJournalAnalytics();
      setTradeActionError('');
    } catch (error) {
      setTradeActionError(error instanceof Error ? error.message : 'Unable to save trade');
      return;
    }
    setShowAddTrade(false);
    setEditingTrade(null);
    setTradeForm({
      symbol: 'EURUSD',
      direction: 'Long',
      entry: '1.0848',
      exit: '1.0886',
      size: '1.2',
      strategy: 'EMA + Price Action',
      session: 'London',
      entryDate: new Date().toISOString().slice(0, 10),
      entryTime: '09:00',
      exitDate: new Date().toISOString().slice(0, 10),
      exitTime: '10:00',
      stopLoss: '',
      takeProfit: '',
    });
  };

  const openEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setTradeActionError('');
    const entry = toLocalDateTime(trade.entryTime);
    const exit = toLocalDateTime(trade.exitTime);
    setTradeForm({ symbol: trade.symbol, direction: trade.direction, entry: String(trade.entry), exit: String(trade.exit), size: String(trade.size), strategy: trade.strategy, session: trade.session, entryDate: entry.date, entryTime: entry.time, exitDate: exit.date, exitTime: exit.time, stopLoss: trade.stopLoss ? String(trade.stopLoss) : '', takeProfit: trade.takeProfit ? String(trade.takeProfit) : '' });
    setShowAddTrade(true);
  };

  const deleteTrade = async (trade: Trade) => {
    if (!token || !window.confirm(`Delete the ${trade.symbol} trade? This cannot be undone.`)) return;
    try {
      await tradesApi.remove(token, trade.id);
      setTrades((current) => current.filter((item) => item.id !== trade.id));
      setFundedAnalytics(await fundedAnalyticsApi.get(token, account?.id ?? 0));
      await refreshJournalAnalytics();
      setTradeActionError('');
    } catch (error) {
      setTradeActionError(error instanceof Error ? error.message : 'Unable to delete trade');
    }
  };

  return (
    <div className={`min-h-screen bg-[#05070d] text-slate-100 ${theme === 'light' ? 'theme-light' : ''}`}>
      <div className="mx-auto max-w-[1600px] p-4 md:p-6">
        <header className={`mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition-[margin] duration-200 md:flex-row md:items-center md:justify-between ${sidebarCollapsed ? 'lg:ml-32' : 'lg:ml-80'}`}>
          <div className="static-ui">
            <div className="text-[10px] uppercase tracking-[0.34em] text-blue-400">{activeView}</div>
            <h1 className="mt-2 text-2xl font-semibold text-white">GenG Edge</h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">Track. Analyze. Improve.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">{account?.name ?? 'All Accounts'}</div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">Sep 2026</div>
            <div className="hidden text-sm text-slate-400 sm:block">{user.email}</div>
            <button type="button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:border-blue-500 hover:text-blue-300" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              {theme === 'dark' ? <Sun size={16} /> : <MoonStar size={16} />}
            </button>
            <button type="button" onClick={() => { localStorage.removeItem('gengedge_token'); setToken(null); setUser(null); setTrades([]); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:border-slate-500">Log out</button>
            <button
              type="button"
              onClick={() => { setEditingTrade(null); setTradeActionError(''); setShowAddTrade(true); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              + Add Trade
            </button>
          </div>
        </header>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Workspace navigation">
          {navItems.map(({ label, Icon }) => (
            <button key={label} type="button" onClick={() => setActiveView(label)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${activeView === label ? 'border-blue-700/70 bg-blue-950/50 text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </nav>

        <aside className={`fixed bottom-4 left-4 top-4 hidden flex-col rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-2xl shadow-slate-950/30 transition-[width] duration-200 lg:flex ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="static-ui mb-8 flex items-center gap-3">
            <img src="/assets/geng-edge-logo.png" alt="GenG Edge logo" className="h-9 w-9 rounded-xl object-contain" />
            <div className={sidebarCollapsed ? 'hidden' : ''}>
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Platform</div>
              <div className="text-base font-semibold text-white">GenG Edge</div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">Track. Analyze. Improve.</div>
            </div>
          </div>

          <button type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} className="absolute -right-3 top-8 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:text-white" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <nav className="space-y-2 text-sm">
            {navItems.map(({ label, Icon }) => (
              <button key={label} type="button" onClick={() => setActiveView(label)} title={sidebarCollapsed ? label : undefined} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${sidebarCollapsed ? 'justify-center' : ''} ${activeView === label ? 'border-blue-700/70 bg-blue-950/50 text-white shadow-lg shadow-blue-950/20' : 'border-transparent bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'}`}>
                <Icon size={16} />
                <span className={sidebarCollapsed ? 'hidden' : ''}>{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-blue-900/60 bg-blue-950/40 p-3 text-sm text-blue-100">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <CircleDollarSign size={16} className="text-blue-400" />
              <span className={sidebarCollapsed ? 'hidden' : ''}>Risk Status</span>
            </div>
            <div className={`text-slate-300 ${sidebarCollapsed ? 'hidden' : ''}`}>Add account limits to monitor risk.</div>
          </div>
        </aside>

        <main className={`ml-0 transition-[margin] duration-200 ${sidebarCollapsed ? 'lg:ml-32' : 'lg:ml-80'}`}>
          {activeView !== 'Dashboard' ? <div className="mb-6"><WorkspaceView view={activeView} theme={theme} trades={filteredTrades} metrics={workspaceMetrics} account={account} fundedAnalytics={fundedAnalytics} journalStats={journalStats} calendarData={calendarData} aiReport={aiReport} onAddTrade={() => { setEditingTrade(null); setTradeActionError(''); setShowAddTrade(true); }} onEditTrade={openEditTrade} onDeleteTrade={deleteTrade} onAccountSaved={(savedAccount) => { setAccount(savedAccount); if (token) void fundedAnalyticsApi.get(token, savedAccount.id).then(setFundedAnalytics); }} onCalendarPrevious={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} onCalendarNext={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} /></div> : null}

          {activeView === 'Dashboard' ? <>
          <section className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-400">
              <Search size={15} className="text-slate-500" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search trades, symbols, notes" className="w-72 bg-transparent text-slate-200 outline-none placeholder:text-slate-500" />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <select value={filterSymbol} onChange={(event) => setFilterSymbol(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 outline-none"><option>All symbols</option>{Array.from(new Set(trades.map((trade) => trade.symbol))).map((symbol) => <option key={symbol}>{symbol}</option>)}</select>
              <select value={filterDirection} onChange={(event) => setFilterDirection(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 outline-none"><option>All directions</option><option>Long</option><option>Short</option></select>
              <select value={filterSession} onChange={(event) => setFilterSession(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 outline-none"><option>All sessions</option><option>London</option><option>New York</option><option>Asian</option></select>
              <input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 outline-none" aria-label="From date" />
              <input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 outline-none" aria-label="To date" />
              <button type="button" onClick={() => { setSearchQuery(''); setFilterSymbol('All symbols'); setFilterDirection('All directions'); setFilterSession('All sessions'); setFilterFrom(''); setFilterTo(''); }} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 hover:border-slate-700"><Filter size={14} /> Clear</button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {derivedMetrics.cards.map((stat) => (
              <MetricCard key={stat.label} title={stat.label} value={stat.value} trend={trades.length > 0 && stat.tone !== 'neutral' ? 'Live' : undefined} tone={stat.tone} />
            ))}
          </section>

          <section className="mt-6"><div className="mb-3 flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Quick Stats</div><h2 className="mt-1 text-lg font-semibold text-white">Trade outcomes</h2></div><span className="text-xs text-slate-500">From stored net P&amp;L</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[['Avg Win', journalStats?.average_win], ['Avg Loss', journalStats?.average_loss], ['Best Trade', journalStats?.best_trade], ['Worst Trade', journalStats?.worst_trade]].map(([label, value]) => <MetricCard key={label} title={label as string} value={displayMoney(value as number | null | undefined)} tone={(value as number | null | undefined ?? 0) >= 0 ? 'positive' : 'negative'} />)}</div></section>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="text-[10px] uppercase tracking-[0.24em] text-blue-400">Funded account control room</div><h2 className="mt-1 text-lg font-semibold text-white">{account?.broker ?? 'Funded account'} · {account?.name ?? 'Primary Account'}</h2></div><span className="w-fit rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300">{fundedAnalytics?.risk.overall_status ?? 'DATA UNAVAILABLE'}</span></div>
            <div className="mt-5 grid gap-4 md:grid-cols-3"><div><div className="flex justify-between text-xs text-slate-400"><span>Profit target</span><span>{fundedAnalytics?.account.profit_target === null || !fundedAnalytics ? 'DATA UNAVAILABLE' : `${formatCurrency(fundedAnalytics.performance.net_profit)} / ${formatCurrency(fundedAnalytics.account.profit_target)}`}</span></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(Math.max(fundedAnalytics?.account.profit_progress_percent ?? 0, 0), 100)}%` }} /></div></div><div><div className="flex justify-between text-xs text-slate-400"><span>Daily loss</span><span>{fundedAnalytics?.risk.daily_loss_limit === null || !fundedAnalytics ? 'DATA UNAVAILABLE' : `${formatCurrency(fundedAnalytics.risk.daily_loss_used)} / ${formatCurrency(fundedAnalytics.risk.daily_loss_limit)}`}</span></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(fundedAnalytics?.risk.daily_loss_usage_percent ?? 0, 100)}%` }} /></div></div><div><div className="flex justify-between text-xs text-slate-400"><span>Drawdown</span><span>{fundedAnalytics?.account.drawdown_remaining === null || !fundedAnalytics ? 'DATA UNAVAILABLE' : `${formatCurrency(fundedAnalytics.account.current_drawdown)} used`}</span></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${fundedAnalytics?.account.drawdown_remaining !== null && fundedAnalytics?.rules.maximum_drawdown_amount ? Math.min(fundedAnalytics.account.current_drawdown / fundedAnalytics.rules.maximum_drawdown_amount * 100, 100) : 0}%` }} /></div></div></div>
          </section>

          <section className="mt-6"><MonthlyCalendar data={calendarData} onPrevious={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} onNext={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} /></section>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Trading calendar</div><h2 className="mt-1 text-lg font-semibold text-white">Daily performance</h2></div><button type="button" onClick={() => setActiveView('Calendar')} className="text-sm text-blue-300 hover:text-blue-200">Open full calendar</button></div>
            {Array.from(new Set(filteredTrades.map((trade) => trade.date))).length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">No calendar data for the current filters.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from(new Set(filteredTrades.map((trade) => trade.date))).slice(0, 8).map((date) => { const dayTrades = filteredTrades.filter((trade) => trade.date === date); const pnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0); const wins = dayTrades.filter((trade) => trade.pnl > 0).length; return <div key={date} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs text-slate-400">{date}</div><div className={`mt-2 text-lg font-semibold ${getPnlTone(pnl)}`}>{formatCurrency(pnl)}</div><div className="mt-1 text-xs text-slate-500">{dayTrades.length} trades · {dayTrades.length ? (wins / dayTrades.length * 100).toFixed(0) : 0}% win rate</div></div>; })}</div>}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Equity Curve</div>
                  <h2 className="mt-1 text-lg font-semibold text-white">Performance overview</h2>
                  <p className="mt-1 text-xs text-slate-500">Account equity after each closed trade</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-right">
                  <div><div className="text-[9px] uppercase tracking-wider text-slate-500">Current</div><div className="mt-1 text-sm font-semibold text-white">{formatCurrency(derivedMetrics.currentEquity)}</div></div>
                  <div><div className="text-[9px] uppercase tracking-wider text-slate-500">Return</div><div className={`mt-1 text-sm font-semibold ${getPnlTone(derivedMetrics.returnPercent)}`}>{derivedMetrics.returnPercent.toFixed(1)}%</div></div>
                  <div><div className="text-[9px] uppercase tracking-wider text-slate-500">Max DD</div><div className="mt-1 text-sm font-semibold text-red-300">{formatCurrency(derivedMetrics.maxDrawdown)}</div></div>
                </div>
              </div>
              <div className="h-80 min-w-0">
                {filteredTrades.length === 0 ? <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-sm text-slate-500">Add trades to build your equity curve.</div> : null}
                {filteredTrades.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={derivedMetrics.equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.area} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={chartColors.area} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="date" stroke={chartColors.axis} tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} width={72} />
                    <ReferenceLine y={0} stroke={chartColors.axis} strokeDasharray="4 4" label={{ value: '0', fill: chartColors.axis, fontSize: 10, position: 'insideTopLeft' }} />
                    <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'value' ? 'Equity' : 'P&L']} labelStyle={{ color: chartColors.axis }} contentStyle={{ backgroundColor: chartColors.tooltipBackground, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '0.75rem' }} />
                    <Area type="monotone" dataKey="value" name="Equity" stroke={chartColors.area} strokeWidth={2.5} fill="url(#equityFill)" activeDot={{ r: 5, fill: chartColors.area, stroke: chartColors.areaShadow }} />
                  </AreaChart>
                </ResponsiveContainer> : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-xs md:grid-cols-4"><div><div className="text-slate-500">Starting equity</div><div className="mt-1 font-medium text-slate-200">{formatCurrency(derivedMetrics.startingBalance)}</div></div><div><div className="text-slate-500">Best trade</div><div className="mt-1 font-medium text-blue-400">{formatCurrency(derivedMetrics.bestTrade)}</div></div><div><div className="text-slate-500">Worst trade</div><div className="mt-1 font-medium text-red-400">{formatCurrency(derivedMetrics.worstTrade)}</div></div><div><div className="text-slate-500">Data points</div><div className="mt-1 font-medium text-slate-200">{filteredTrades.length} trades</div></div></div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-slate-400">Insights</div>
              <div className="space-y-3">
                {derivedMetrics.insights.map((insight) => (
                  <div key={insight} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-slate-400">Session Performance</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={derivedMetrics.sessions}>
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={chartColors.axis} tickLine={false} axisLine={false} />
                    <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBackground, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '0.75rem' }} />
                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]} fill={chartColors.bar} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-slate-400">Top Symbols</div>
              <div className="space-y-4">
                {derivedMetrics.symbols.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                      <span>{item.name}</span>
                      <span className="text-blue-400">+${item.pnl}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${Math.min(item.pnl / 5, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-slate-400">Recent Trades</div>
              <div className="space-y-3">
                {derivedMetrics.recent.map((trade) => (
                  <div key={`${trade.symbol}-${trade.id}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <div>
                      <div className="font-medium text-slate-100">{trade.symbol}</div>
                      <div className="text-xs text-slate-400">{trade.direction}</div>
                    </div>
                    <div className="text-right">
                      <div className={trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(trade.pnl)}</div>
                      <div className="text-xs text-slate-400">{trade.pnl >= 0 ? 'Win' : 'Loss'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Trade History</div>
                <h2 className="mt-1 text-lg font-semibold text-white">Recent executions</h2>
              </div>
              <div className="text-sm text-slate-300">{filteredTrades.length} of {trades.length} trades • {winRate} win rate • ${filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0).toFixed(2)} total</div>
            </div>

            {workspaceError ? <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">{workspaceError}</div> : null}
            {trades.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center"><div className="text-lg font-medium text-white">No trades yet</div><p className="mt-2 text-sm text-slate-400">Add your first trade to start building real performance intelligence.</p><button type="button" onClick={() => setShowAddTrade(true)} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">+ Add your first trade</button></div> : null}
            {trades.length > 0 && filteredTrades.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 text-center text-sm text-slate-400">No trades match the current filters.</div> : null}

            {filteredTrades.length > 0 ? <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Symbol</th>
                    <th className="px-3 py-2 font-medium">Direction</th>
                    <th className="px-3 py-2 font-medium">Entry</th>
                    <th className="px-3 py-2 font-medium">Exit</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 font-medium">Strategy</th>
                    <th className="px-3 py-2 font-medium">Session</th>
                    <th className="px-3 py-2 font-medium">P&L</th>
                    <th className="px-3 py-2 font-medium">R:R</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200">
                      <td className="rounded-l-xl px-3 py-3">{trade.date}</td>
                      <td className="px-3 py-3 font-medium text-white">{trade.symbol}</td>
                      <td className="px-3 py-3">
                        <span className={trade.direction === 'Long' ? 'text-emerald-400' : 'text-red-400'}>{trade.direction}</span>
                      </td>
                      <td className="px-3 py-3">{trade.entry}</td>
                      <td className="px-3 py-3">{trade.exit}</td>
                      <td className="px-3 py-3">{trade.size}</td>
                      <td className="px-3 py-3">{trade.strategy}</td>
                      <td className="px-3 py-3">{trade.session}</td>
                      <td className={`px-3 py-3 font-medium ${getPnlTone(trade.pnl)}`}>{formatCurrency(trade.pnl)}</td>
                      <td className="px-3 py-3">{trade.rr.toFixed(1)}</td>
                      <td className="px-3 py-3"><div className="flex items-center gap-2"><button type="button" onClick={() => openEditTrade(trade)} title="Edit trade" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-blue-600 hover:text-blue-300"><Pencil size={14} /></button><button type="button" onClick={() => deleteTrade(trade)} title="Delete trade" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-red-600 hover:text-red-300"><Trash2 size={14} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div> : null}
          </section>
          </> : null}
        </main>
      </div>

      {showAddTrade ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
          <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/80 sm:max-h-[calc(100vh-3rem)]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.26em] text-blue-400">Trade Entry</div>
                <h3 className="mt-1 text-xl font-semibold text-white">{editingTrade ? 'Edit trade' : 'Add trade'}</h3>
              </div>
              <button type="button" onClick={() => { setShowAddTrade(false); setEditingTrade(null); setTradeActionError(''); }} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-300">Close</button>
            </div>

            <form onSubmit={handleTradeSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Symbol
                  <input list="instrument-suggestions" autoComplete="off" value={tradeForm.symbol} onChange={(event) => setTradeForm((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
                  <datalist id="instrument-suggestions">{instrumentSuggestions.map((symbol) => <option key={symbol} value={symbol} />)}</datalist>
                </label>

                <label className="text-sm text-slate-300">
                  Direction
                  <select value={tradeForm.direction} onChange={(event) => setTradeForm((current) => ({ ...current, direction: event.target.value as Direction }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500">
                    <option value="Long">Long</option>
                    <option value="Short">Short</option>
                  </select>
                </label>

                <label className="text-sm text-slate-300">
                  Entry price
                  <input type="number" step="0.0001" value={tradeForm.entry} onChange={(event) => setTradeForm((current) => ({ ...current, entry: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
                </label>

                <label className="text-sm text-slate-300">
                  Exit price
                  <input type="number" step="0.0001" value={tradeForm.exit} onChange={(event) => setTradeForm((current) => ({ ...current, exit: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
                </label>

                <label className="text-sm text-slate-300">Entry date<input type="date" value={tradeForm.entryDate} onChange={(event) => setTradeForm((current) => ({ ...current, entryDate: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-slate-300">Entry time<input type="time" value={tradeForm.entryTime} onChange={(event) => setTradeForm((current) => ({ ...current, entryTime: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-slate-300">Exit date<input type="date" value={tradeForm.exitDate} onChange={(event) => setTradeForm((current) => ({ ...current, exitDate: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-slate-300">Exit time<input type="time" value={tradeForm.exitTime} onChange={(event) => setTradeForm((current) => ({ ...current, exitTime: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>

                <label className="text-sm text-slate-300">
                  Size
                  <input type="number" step="0.1" value={tradeForm.size} onChange={(event) => setTradeForm((current) => ({ ...current, size: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
                </label>

                <div className="rounded-xl border border-blue-900/60 bg-blue-950/30 p-3 text-sm md:col-span-2">
                  <div className="flex items-center justify-between"><span className="text-slate-400">Estimated gross P&amp;L</span><span className={getPnlTone(tradePreview.pnl)}>{formatCurrency(tradePreview.pnl)}</span></div>
                  <div className="mt-1 text-xs text-slate-500">{tradeForm.size || '0'} lot × {tradePreview.contractSize.toLocaleString()} contract units · backend recalculates on save</div>
                </div>

                <label className="text-sm text-slate-300">Stop loss<input type="number" step="0.00001" value={tradeForm.stopLoss} onChange={(event) => setTradeForm((current) => ({ ...current, stopLoss: event.target.value }))} placeholder="Optional" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-slate-300">Take profit<input type="number" step="0.00001" value={tradeForm.takeProfit} onChange={(event) => setTradeForm((current) => ({ ...current, takeProfit: event.target.value }))} placeholder="Optional" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3 text-sm md:col-span-2"><div className="flex items-center justify-between"><span className="text-slate-400">Planned risk/reward</span><span className="font-semibold text-emerald-300">{(() => { const risk = tradeForm.stopLoss ? (tradeForm.direction === 'Long' ? Number(tradeForm.entry) - Number(tradeForm.stopLoss) : Number(tradeForm.stopLoss) - Number(tradeForm.entry)) : 0; const reward = tradeForm.takeProfit ? (tradeForm.direction === 'Long' ? Number(tradeForm.takeProfit) - Number(tradeForm.entry) : Number(tradeForm.entry) - Number(tradeForm.takeProfit)) : 0; return risk > 0 && reward > 0 ? `1:${(reward / risk).toFixed(2)}` : 'Add valid SL and TP'; })()}</span></div><div className="mt-1 text-xs text-slate-500">Backend validates and recalculates R:R when saved.</div></div>

                <label className="text-sm text-slate-300">
                  Session
                  <select value={tradeForm.session} onChange={(event) => setTradeForm((current) => ({ ...current, session: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500">
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                    <option value="Asian">Asian</option>
                  </select>
                </label>

                <label className="text-sm text-slate-300 md:col-span-2">
                  Strategy
                  <input value={tradeForm.strategy} onChange={(event) => setTradeForm((current) => ({ ...current, strategy: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
                </label>

              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                <div className="mb-2 flex items-center gap-2 text-white">
                  <Check size={16} className="text-emerald-400" />
                  Pre-trade checklist
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {['Trend aligned', 'Liquidity sweep', 'Structure break', 'Confirmation candle', 'Risk planned'].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-slate-300">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              {tradeActionError ? <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">{tradeActionError}</div> : null}
              <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/95 px-5 py-4 pt-4 backdrop-blur sm:-mx-6 sm:px-6">
                <button type="button" onClick={() => { setShowAddTrade(false); setEditingTrade(null); setTradeActionError(''); }} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200">Cancel</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">{editingTrade ? 'Update Trade' : 'Save Trade'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
