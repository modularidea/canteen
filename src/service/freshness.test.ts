import { describe, expect, it } from 'vitest';
import { MenuDay } from '../types';
import { CachedPlan, isFresh, localDateKey, weekStartKey } from './freshness';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const day = (date: string): MenuDay => ({ date, meals: [] });
const twoWeeks = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13'].map(day);

describe('localDateKey', () => {
	it('uses the local calendar day of the device', () => {
		expect(localDateKey(at(2026, 10, 7, 23, 30))).toBe('2026-10-07');
		expect(localDateKey(at(2026, 10, 8, 0, 5))).toBe('2026-10-08');
	});
});

describe('weekStartKey', () => {
	it('returns the Monday of the week', () => {
		expect(weekStartKey('2026-10-07')).toBe('2026-10-05');
		expect(weekStartKey('2026-10-05')).toBe('2026-10-05');
		expect(weekStartKey('2026-10-11')).toBe('2026-10-05');
		expect(weekStartKey('2026-10-12')).toBe('2026-10-12');
	});
});

describe('isFresh', () => {
	it('is fresh on Thursday for a plan fetched on Monday of the same week that contains Thursday', () => {
		const plan: CachedPlan = { fetchedAt: at(2026, 10, 5, 8), days: twoWeeks };
		expect(isFresh(plan, at(2026, 10, 8, 12))).toBe(true);
	});

	it('is stale on Monday for a plan fetched the Friday before', () => {
		const plan: CachedPlan = { fetchedAt: at(2026, 10, 9, 15), days: twoWeeks };
		expect(isFresh(plan, at(2026, 10, 12, 9))).toBe(false);
	});

	it('is fresh for the rest of the day it was fetched, even without an entry for today', () => {
		const plan: CachedPlan = { fetchedAt: at(2026, 10, 10, 10), days: twoWeeks };
		expect(isFresh(plan, at(2026, 10, 10, 15))).toBe(true);
	});

	it('is stale the next day when there is still no entry for today (one fetch per weekend day)', () => {
		const plan: CachedPlan = { fetchedAt: at(2026, 10, 10, 10), days: twoWeeks };
		expect(isFresh(plan, at(2026, 10, 11, 10))).toBe(false);
	});

	it('is stale when the plan has today but was fetched in a previous week', () => {
		const plan: CachedPlan = { fetchedAt: at(2026, 10, 4, 20), days: twoWeeks };
		expect(isFresh(plan, at(2026, 10, 5, 8))).toBe(false);
	});

	it('treats an empty plan fetched today as fresh', () => {
		expect(isFresh({ fetchedAt: at(2026, 10, 7, 9), days: [] }, at(2026, 10, 7, 18))).toBe(true);
	});

	it('is stale right after midnight on the week change', () => {
		const plan: CachedPlan = { fetchedAt: at(2026, 10, 11, 23, 59), days: twoWeeks };
		expect(isFresh(plan, at(2026, 10, 12, 0, 1))).toBe(false);
	});

	it('is stale when the device clock went back before the fetch time', () => {
		const plan: CachedPlan = { fetchedAt: at(2026, 10, 9, 12), days: twoWeeks };
		expect(isFresh(plan, at(2026, 10, 7, 12))).toBe(false);
	});
});
