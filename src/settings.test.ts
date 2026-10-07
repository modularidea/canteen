import { describe, expect, it } from 'vitest';
import { CanteenRef } from './types';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

const htwg: CanteenRef = {
	id: 'seezeit:mensa_htwg',
	provider: 'seezeit',
	ref: 'mensa_htwg',
	name: 'Mensa HTWG',
	city: 'Konstanz',
	sourceName: 'Seezeit',
	sourceUrl: 'https://seezeit.com/essen/speiseplaene/mensa-htwg/',
};

describe('normalizeSettings', () => {
	it('returns defaults (price tier "student", no favorites) for missing data', () => {
		expect(DEFAULT_SETTINGS.priceRole).toBe('student');
		expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
	});

	it('keeps every valid price tier', () => {
		expect(normalizeSettings({ priceRole: 'employee' }).priceRole).toBe('employee');
		expect(normalizeSettings({ priceRole: 'guest' }).priceRole).toBe('guest');
		expect(normalizeSettings({ priceRole: 'student' }).priceRole).toBe('student');
	});

	it('falls back to defaults instead of crashing on garbage', () => {
		const result = normalizeSettings({ priceRole: 'bogus', favorites: 'x', cache: 7, selectedId: 5 });
		expect(result).toEqual(DEFAULT_SETTINGS);
	});

	it('keeps valid favorites and drops ones with an unknown provider or missing fields', () => {
		const result = normalizeSettings({
			favorites: [htwg, { ...htwg, id: 'x', provider: 'nope' }, { id: 'broken' }, null],
		});
		expect(result.favorites).toEqual([htwg]);
	});

	it('keeps selectedId only if it points to a favorite', () => {
		expect(normalizeSettings({ favorites: [htwg], selectedId: htwg.id }).selectedId).toBe(htwg.id);
		expect(normalizeSettings({ favorites: [htwg], selectedId: 'seezeit:other' }).selectedId).toBeUndefined();
	});

	it('keeps well-formed cache entries and drops malformed ones', () => {
		const good = { fetchedAt: 1, days: [{ date: '2026-10-05', meals: [] }] };
		const result = normalizeSettings({ cache: { a: good, b: { fetchedAt: 'x', days: [] }, c: 'nope' } });
		expect(result.cache).toEqual({ a: good });
	});
});
