const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export type AuthUser = {
  id: number;
  email: string;
  full_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  avatar_zoom?: number;
  avatar_position?: string;
  is_active: boolean;
};

export type NotificationSettings = {
  email_enabled: boolean;
  notification_email: string | null;
};

export type Account = {
  id: number;
  user_id: number;
  name: string;
  broker?: string | null;
  account_type?: string | null;
  currency: string;
  initial_balance: number;
  current_balance: number;
  daily_loss_limit?: number | null;
  max_drawdown?: number | null;
  profit_target?: number | null;
  risk_per_trade?: number | null;
  status: string;
  notes?: string | null;
  profit_target_type?: string;
  daily_loss_limit_type?: string;
  max_drawdown_type?: string;
  minimum_trading_days?: number;
  drawdown_type?: string;
  daily_loss_calculation_method?: string;
  daily_reset_time?: string;
  daily_reset_timezone?: string;
  maximum_trading_days?: number | null;
  maximum_position_size?: number | null;
  leverage?: number | null;
  daily_profit_target?: number | null;
  consistency_rule_enabled?: boolean;
  consistency_max_best_day_percent?: number | null;
  news_trading_restriction?: boolean;
  weekend_holding_restriction?: boolean;
  maximum_trades_per_day?: number | null;
  maximum_losing_trades_per_day?: number | null;
  trailing_drawdown_type?: string | null;
  trailing_drawdown_value?: number | null;
};

export type FundedAnalytics = {
  rules: { profit_target_amount: number | null; daily_loss_limit_amount: number | null; maximum_drawdown_amount: number | null; minimum_trading_days: number; drawdown_type: string; consistency_enabled: boolean };
  performance: { total_trades: number; winning_trades: number; losing_trades: number; gross_profit: number; gross_loss: number; net_profit: number; win_rate: number; profit_factor: number | null; expectancy: number | null; average_pnl: number | null };
  account: { starting_balance: number; calculated_balance: number; recorded_balance: number; reconciliation_difference: number; equity: number; return_percent: number | null; profit_target: number | null; profit_progress_percent: number | null; high_water_mark: number; drawdown_floor: number | null; current_drawdown: number; drawdown_remaining: number | null };
  risk: { daily_loss_limit: number | null; daily_loss_used: number; daily_loss_remaining: number | null; daily_loss_usage_percent: number | null; daily_status: string; drawdown_status: string; overall_status: string };
  trading_days: { count: number; minimum: number; status: string };
  daily_performance: Array<{ date: string; starting_balance: number; net_pnl: number; ending_balance: number; daily_loss_used_percent: number | null; trades: number; wins: number; losses: number; status: string }>;
  equity_curve: Array<{ timestamp: string; equity: number; drawdown: number }>;
};

export type JournalStats = {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  gross_profit: number;
  gross_loss: number;
  net_profit: number;
  average_win: number | null;
  average_loss: number | null;
  best_trade: number;
  worst_trade: number;
  profit_factor: number | null;
  average_trade: number | null;
  trading_days: number;
  start_date?: string;
  end_date?: string;
  best_symbol?: { name: string; net_profit: number } | null;
  worst_symbol?: { name: string; net_profit: number } | null;
  best_strategy?: { name: string; net_profit: number } | null;
  best_session?: { name: string; net_profit: number } | null;
};

export type JournalCalendar = { year: number; month: number; monthly_pnl: number; trading_days: number; daily: Array<{ date: string; pnl: number; trades: number; wins: number; losses: number }>; weekly: Array<{ week: number; pnl: number }> };
export type StrategyPerformance = { name: string; trades: number; pnl: number; win_rate: number; profit_factor: number | null; expectancy: number };
export type AiReport = { data_available: boolean; summary: JournalStats; best_symbol: { name: string; net_profit: number } | null; worst_symbol: { name: string; net_profit: number } | null; best_strategy: { name: string; net_profit: number } | null; worst_strategy: { name: string; net_profit: number } | null; best_session: { name: string; net_profit: number } | null; weakest_session: { name: string; net_profit: number } | null; best_direction: { name: string; net_profit: number } | null; worst_direction: { name: string; net_profit: number } | null; observations: string[]; recommendations: string[]; risk_flags: string[]; quality: { average_confidence: number | null; average_discipline: number | null; average_tlc: number; trades_without_stop: number; trades_without_target: number }; streaks: { max_win_streak: number; max_loss_streak: number }; daily_breakdown: Array<{ date: string; net_profit: number; total_trades: number; win_rate: number }>; best_day: { date: string; net_profit: number } | null; worst_day: { date: string; net_profit: number } | null; analysis_method: string };

export type ApiTrade = {
  id: number;
  user_id: number;
  account_id: number;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price: number;
  entry_time: string;
  exit_time: string;
  stop_loss?: number | null;
  take_profit?: number | null;
  risk_amount?: number | null;
  risk_percentage?: number | null;
  strategy?: string | null;
  session?: string | null;
  emotion?: string | null;
  notes?: string | null;
  tlc_score: number;
  net_pnl: number;
  risk_reward_ratio: number;
  source: string;
  win_loss: string;
};

type AuthResponse = {
  access_token: string;
  user: AuthUser;
};

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token && token !== 'cookie-session') headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? body?.error?.message ?? 'Request failed');
  }
  return body as T;
}

export const authApi = {
  login: (email: string, password: string) => request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (email: string, password: string, full_name: string) => request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name }),
  }),
  me: (token?: string | null) => request<AuthUser>('/api/auth/me', {}, token),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) => request<{ message: string; development_reset_url?: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string | null | undefined, password: string) => request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  verifyEmail: (token: string) => request<{ message: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'POST' }),
};

export const usersApi = {
  me: (token?: string | null) => request<AuthUser>('/api/users/me', {}, token),
  updateProfile: (token: string | null | undefined, payload: { full_name?: string | null; username?: string | null; avatar_url?: string | null; avatar_zoom?: number; avatar_position?: string }) => request<AuthUser>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token),
  notificationSettings: (token?: string | null) => request<NotificationSettings>('/api/users/me/notifications', {}, token),
  updateNotificationSettings: (token: string | null | undefined, payload: NotificationSettings) => request<NotificationSettings>('/api/users/me/notifications', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token),
  sendTestEmail: (token?: string | null) => request<{ sent: boolean; reason: string | null }>('/api/notifications/test', {
    method: 'POST',
  }, token),
  changePassword: (token: string | null | undefined, current_password: string, new_password: string) => request<{ message: string }>('/api/users/me/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }, token),
  deleteAccount: (token?: string | null) => request<void>('/api/users/me', { method: 'DELETE' }, token),
};

export const accountsApi = {
  list: (token?: string | null) => request<Account[]>('/api/accounts', {}, token),
  create: (token: string | null | undefined, name = 'Primary Account', payload: Record<string, unknown> = {}) => request<Account>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name, broker: 'Manual', account_type: 'Live', currency: 'USD', ...payload }),
  }, token),
  update: (token: string | null | undefined, accountId: number, payload: Record<string, unknown>) => request<Account>(`/api/accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token),
  remove: (token: string | null | undefined, accountId: number) => request<void>(`/api/accounts/${accountId}`, {
    method: 'DELETE',
  }, token),
};

export const tradesApi = {
  list: (token: string | null | undefined, accountId?: number | null) => request<ApiTrade[]>(accountId ? `/api/trades?account_id=${accountId}` : '/api/trades', {}, token),
  create: (token: string | null | undefined, payload: Record<string, unknown>) => request<ApiTrade>('/api/trades', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token),
  update: (token: string | null | undefined, tradeId: number, payload: Record<string, unknown>) => request<ApiTrade>(`/api/trades/${tradeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token),
  remove: (token: string | null | undefined, tradeId: number) => request<void>(`/api/trades/${tradeId}`, {
    method: 'DELETE',
  }, token),
};

export const fundedAnalyticsApi = {
  get: (token: string | null | undefined, accountId: number) => request<FundedAnalytics>(`/api/analytics/funded-account/${accountId}`, {}, token),
};

export const journalAnalyticsApi = {
  last30: (token: string | null | undefined, accountId?: number | null) => request<JournalStats>(`/api/analytics/last-30-days${accountId ? `?account_id=${accountId}` : ''}`, {}, token),
  calendar: (token: string | null | undefined, year: number, month: number, accountId?: number | null) => request<JournalCalendar>(`/api/analytics/calendar/${year}/${month}${accountId ? `?account_id=${accountId}` : ''}`, {}, token),
  report: (token: string | null | undefined, accountId?: number | null) => request<AiReport>(`/api/analytics/ai-report${accountId ? `?account_id=${accountId}` : ''}`, {}, token),
  strategies: (token: string | null | undefined, accountId?: number | null) => request<{ items: StrategyPerformance[]; total: StrategyPerformance }>(`/api/analytics/strategies${accountId ? `?account_id=${accountId}` : ''}`, {}, token),
};
