// All user-visible price/date formatting goes through here so the system
// locale applies everywhere (no hard-coded 'de-DE' or '€' in the UI).

export function formatPrice(cents: number, locale?: string): string {
	return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Labels for a `YYYY-MM-DD` key. Computed in UTC so the day never shifts with the device time zone. */
export function formatDayLabel(date: string, locale?: string): { weekday: string; short: string } {
	const [y, m, d] = date.split('-').map(Number) as [number, number, number];
	const instant = new Date(Date.UTC(y, m - 1, d));
	return {
		weekday: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(instant),
		short: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(instant),
	};
}

export function formatWeekdayShort(date: string, locale?: string): string {
	const [y, m, d] = date.split('-').map(Number) as [number, number, number];
	return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "10 minutes ago" style age of a cached plan; a clock that went back counts as "this minute". */
export function formatAge(fetchedAt: number, nowMs: number, locale?: string): string {
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	const minutes = Math.max(0, Math.floor((nowMs - fetchedAt) / 60_000));
	if (minutes < 1) return rtf.format(0, 'minute');
	if (minutes < 60) return rtf.format(-minutes, 'minute');
	const hours = Math.floor(minutes / 60);
	if (hours < 48) return rtf.format(-hours, 'hour');
	return rtf.format(-Math.floor(hours / 24), 'day');
}
