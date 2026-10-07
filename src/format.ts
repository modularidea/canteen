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
