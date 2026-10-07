import { describe, expect, it } from 'vitest';
import { MenuDay } from '../types';
import { pickDefaultDay, shiftDay, todayKey } from './day-select';

const days = (...dates: string[]): MenuDay[] => dates.map((date) => ({ date, meals: [] }));
const week = days('2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12');

describe('todayKey', () => {
	it('uses the local calendar day, not UTC', () => {
		expect(todayKey(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
		expect(todayKey(new Date(2026, 9, 7, 0, 5))).toBe('2026-10-07');
	});
});

describe('pickDefaultDay', () => {
	it('picks today when the plan has it', () => {
		expect(pickDefaultDay(week, '2026-10-07')).toBe('2026-10-07');
	});

	it('jumps to the next day with data on a weekend', () => {
		expect(pickDefaultDay(week, '2026-10-10')).toBe('2026-10-12');
		expect(pickDefaultDay(week, '2026-10-11')).toBe('2026-10-12');
	});

	it('falls back to the last day when the whole plan is in the past', () => {
		expect(pickDefaultDay(week, '2026-11-01')).toBe('2026-10-12');
	});

	it('falls back to the first day when the plan only starts in the future', () => {
		expect(pickDefaultDay(week, '2026-09-01')).toBe('2026-10-05');
	});

	it('returns undefined without days', () => {
		expect(pickDefaultDay([], '2026-10-07')).toBeUndefined();
	});
});

describe('shiftDay', () => {
	it('moves to the neighbouring day with data', () => {
		expect(shiftDay(week, '2026-10-09', 1)).toBe('2026-10-12');
		expect(shiftDay(week, '2026-10-06', -1)).toBe('2026-10-05');
	});

	it('returns undefined at the edges and for an unknown day', () => {
		expect(shiftDay(week, '2026-10-12', 1)).toBeUndefined();
		expect(shiftDay(week, '2026-10-05', -1)).toBeUndefined();
		expect(shiftDay(week, '2026-10-10', 1)).toBeUndefined();
	});
});
