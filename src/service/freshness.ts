import { MenuDay } from '../types';

export interface CachedPlan {
	fetchedAt: number;
	days: MenuDay[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar day of the device's own time zone, `YYYY-MM-DD`. */
export function localDateKey(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of the week containing the given `YYYY-MM-DD` key. */
export function weekStartKey(dateKey: string): string {
	const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
	const date = new Date(Date.UTC(y, m - 1, d));
	date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * A plan needs no refetch if it was loaded today, or if it covers today and
 * was loaded this week (Monday-based). The feed delivers about two weeks per
 * request, so one load on Monday serves the whole week.
 */
export function isFresh(plan: CachedPlan, nowMs: number): boolean {
	const today = localDateKey(nowMs);
	const fetched = localDateKey(plan.fetchedAt);
	if (fetched > today) return false; // clock went back; do not trust the cache
	if (fetched === today) return true;
	return plan.days.some((d) => d.date === today) && fetched >= weekStartKey(today);
}
