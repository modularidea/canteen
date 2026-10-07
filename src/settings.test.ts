import { describe, expect, it } from 'vitest';
import { CanteenRef } from './types';
import { DEFAULT_SETTINGS, CanteenSettings, moveFavorite, normalizeSettings, removeFavorite } from './settings';

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

const other: CanteenRef = { ...htwg, id: 'seezeit:mensa_giessberg', ref: 'mensa_giessberg', name: 'Mensa Gießberg' };
const plan = { fetchedAt: 1, days: [] };
const make = (): CanteenSettings => ({
	favorites: [htwg, other],
	selectedId: htwg.id,
	priceRole: 'student',
	cache: { [htwg.id]: plan, [other.id]: plan },
});

describe('removeFavorite', () => {
	it('drops the favorite and its cached plan', () => {
		const s = make();
		removeFavorite(s, other.id);
		expect(s.favorites).toEqual([htwg]);
		expect(Object.keys(s.cache)).toEqual([htwg.id]);
		expect(s.selectedId).toBe(htwg.id);
	});

	it('moves the selection to the first remaining favorite when the selected one is removed', () => {
		const s = make();
		removeFavorite(s, htwg.id);
		expect(s.selectedId).toBe(other.id);
	});

	it('clears the selection when the last favorite is removed', () => {
		const s = make();
		removeFavorite(s, htwg.id);
		removeFavorite(s, other.id);
		expect(s.favorites).toEqual([]);
		expect(s.selectedId).toBeUndefined();
	});

	it('ignores an unknown id', () => {
		const s = make();
		removeFavorite(s, 'nope');
		expect(s).toEqual(make());
	});
});

describe('moveFavorite', () => {
	it('swaps a favorite with its neighbour', () => {
		const s = make();
		moveFavorite(s, htwg.id, 1);
		expect(s.favorites.map((f) => f.id)).toEqual([other.id, htwg.id]);
		moveFavorite(s, htwg.id, -1);
		expect(s.favorites.map((f) => f.id)).toEqual([htwg.id, other.id]);
	});

	it('does nothing at the edges or for an unknown id', () => {
		const s = make();
		moveFavorite(s, htwg.id, -1);
		moveFavorite(s, other.id, 1);
		moveFavorite(s, 'nope', 1);
		expect(s).toEqual(make());
	});
});
