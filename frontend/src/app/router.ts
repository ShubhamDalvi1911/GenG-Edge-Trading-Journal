import type { ViewName } from '../types/workspace';
const routeByView: Record<ViewName, string> = { Dashboard:'/app/dashboard', Trades:'/app/trades', Analytics:'/app/analytics', Calendar:'/app/calendar', 'Performance Review':'/app/performance-review', Strategies:'/app/strategies', Risk:'/app/risk', Tools:'/app/tools', Settings:'/app/settings' };
const viewByRoute = Object.fromEntries(Object.entries(routeByView).map(([view, route]) => [route, view as ViewName])) as Record<string, ViewName>;
export function viewFromLocation(pathname: string): ViewName { return viewByRoute[pathname] ?? (pathname === '/app' ? 'Dashboard' : 'Dashboard'); }
export function routeForView(view: ViewName): string { return routeByView[view]; }
