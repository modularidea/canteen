import { describe, expect, it } from 'vitest';
import { formatDayLabel, formatPrice } from './format';

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
