import { describe, expect, it } from 'vitest';
import { formatAge, formatDayLabel, formatPrice, formatWeekdayShort } from './format';

const normalize = (s: string) => s.replace(/ | /g, ' ');

describe('formatPrice', () => {
	it('formats cents as euros with the given locale', () => {
		expect(normalize(formatPrice(440, 'de-DE'))).toBe('4,40 €');
		expect(normalize(formatPrice(90, 'en-GB'))).toBe('€0.90');
	});
});

describe('formatDayLabel', () => {
	it('returns weekday and short date for a YYYY-MM-DD key', () => {
		expect(formatDayLabel('2026-10-07', 'en-GB')).toEqual({ weekday: 'Wednesday', short: '7 Oct' });
	});

	it('never shifts the calendar day, whatever the process time zone', () => {
		const original = process.env.TZ;
		try {
			for (const tz of ['Pacific/Auckland', 'America/Los_Angeles']) {
				process.env.TZ = tz;
				expect(formatDayLabel('2026-10-05', 'en-GB').short).toBe('5 Oct');
			}
		} finally {
			if (original === undefined) delete process.env.TZ;
			else process.env.TZ = original;
		}
	});
});

describe('formatWeekdayShort', () => {
	it('returns the abbreviated weekday of a YYYY-MM-DD key', () => {
		expect(formatWeekdayShort('2026-10-07', 'en-GB')).toBe('Wed');
		expect(formatWeekdayShort('2026-10-05', 'de-DE')).toBe('Mo');
	});
});

describe('formatAge', () => {
	const now = Date.UTC(2026, 9, 7, 12, 0, 0);
	it('describes minutes, hours and days in the given locale', () => {
		expect(formatAge(now - 30 * 1000, now, 'en-GB')).toBe('this minute');
		expect(formatAge(now - 10 * 60 * 1000, now, 'en-GB')).toBe('10 minutes ago');
		expect(formatAge(now - 5 * 3600 * 1000, now, 'en-GB')).toBe('5 hours ago');
		expect(formatAge(now - 3 * 24 * 3600 * 1000, now, 'en-GB')).toBe('3 days ago');
	});
	it('never produces a negative age when the clock went back', () => {
		expect(formatAge(now + 3600 * 1000, now, 'en-GB')).toBe('this minute');
	});
});
