import { describe, expect, it } from 'vitest';
import { LoadResult } from '../service/menu-service';
import { MenuDay, ProviderError } from '../types';
import { sameResult } from './same-result';

const days: MenuDay[] = [{ date: '2026-10-07', meals: [] }];
const result = (over: Partial<LoadResult> = {}): LoadResult => ({ days, fetchedAt: 1000, stale: false, ...over });

describe('sameResult', () => {
	it('is true for the same cached plan handed out again (a cache hit)', () => {
		expect(sameResult(result(), result())).toBe(true);
	});

	it('is true when both are missing and false when only one is', () => {
		expect(sameResult(undefined, undefined)).toBe(true);
		expect(sameResult(undefined, result())).toBe(false);
		expect(sameResult(result(), undefined)).toBe(false);
	});

	it('is false after a real refetch (new days array or newer fetch time)', () => {
		expect(sameResult(result(), result({ days: [...days] }))).toBe(false);
		expect(sameResult(result(), result({ fetchedAt: 2000 }))).toBe(false);
	});

	it('is false when staleness or the error changes', () => {
		const offline = new ProviderError('network', 'offline');
		expect(sameResult(result(), result({ stale: true, error: offline }))).toBe(false);
		expect(sameResult(result({ stale: true, error: offline }), result({ stale: true, error: new ProviderError('http', 'x', 404) }))).toBe(false);
		expect(sameResult(result({ stale: true, error: offline }), result({ stale: true, error: new ProviderError('network', 'other text') }))).toBe(true);
	});
});
