import { describe, expect, it } from 'vitest';
import { CanteenRef, HttpGet, MenuDay, MenuProvider, ProviderError } from '../types';
import { CachedPlan } from './freshness';
import { CacheStore, MenuService } from './menu-service';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const day = (date: string): MenuDay => ({ date, meals: [] });
const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'].map(day);

const canteen: CanteenRef = {
	id: 'seezeit:mensa_htwg',
	provider: 'seezeit',
	ref: 'mensa_htwg',
	name: 'Mensa HTWG',
	city: 'Konstanz',
	sourceName: 'Seezeit',
	sourceUrl: 'https://seezeit.com/essen/speiseplaene/mensa-htwg/',
};

function setup(initial?: CachedPlan) {
	const state = { now: at(2026, 10, 5, 8), calls: 0, result: week as MenuDay[] | Error };
	const cache = new Map<string, CachedPlan>();
	if (initial) cache.set(canteen.id, initial);
	const store: CacheStore = {
		get: (id) => cache.get(id),
		set: async (id, plan) => {
			cache.set(id, plan);
		},
	};
	const provider: MenuProvider = {
		id: 'seezeit',
		fetchDays: async () => {
			state.calls++;
			await Promise.resolve();
			if (state.result instanceof Error) throw state.result;
			return state.result;
		},
	};
	const get: HttpGet = async () => ({ status: 200, text: '' });
	const service = new MenuService({ get, providers: { seezeit: provider }, store, now: () => state.now });
	return { state, cache, service };
}

describe('MenuService.load', () => {
	it('fetches when nothing is cached and stores the plan', async () => {
		const { state, cache, service } = setup();
		const res = await service.load(canteen);
		expect(state.calls).toBe(1);
		expect(res).toMatchObject({ stale: false, fetchedAt: state.now, days: week });
		expect(cache.get(canteen.id)?.fetchedAt).toBe(state.now);
	});

	it('serves a fresh cache without calling the provider', async () => {
		const { state, service } = setup({ fetchedAt: at(2026, 10, 5, 8), days: week });
		state.now = at(2026, 10, 7, 12);
		const res = await service.load(canteen);
		expect(state.calls).toBe(0);
		expect(res.stale).toBe(false);
		expect(res.days).toEqual(week);
	});

	it('fetches again when the cache is not fresh', async () => {
		const { state, service } = setup({ fetchedAt: at(2026, 10, 2, 9), days: week });
		await service.load(canteen);
		expect(state.calls).toBe(1);
	});

	it('force bypasses a fresh cache', async () => {
		const { state, service } = setup({ fetchedAt: at(2026, 10, 5, 8), days: week });
		await service.load(canteen, { force: true });
		expect(state.calls).toBe(1);
	});

	it('shows the cache as stale with the error when the provider fails', async () => {
		const { state, service } = setup({ fetchedAt: at(2026, 10, 2, 9), days: week });
		state.result = new ProviderError('network', 'offline');
		const res = await service.load(canteen);
		expect(res.stale).toBe(true);
		expect(res.error?.kind).toBe('network');
		expect(res.days).toEqual(week);
		expect(res.fetchedAt).toBe(at(2026, 10, 2, 9));
	});

	it('rejects with the provider error when it fails and nothing is cached', async () => {
		const { state, service } = setup();
		state.result = new ProviderError('http', 'HTTP 404', 404);
		await expect(service.load(canteen)).rejects.toMatchObject({ kind: 'http', status: 404 });
	});

	it('deduplicates concurrent loads of the same canteen', async () => {
		const { state, service } = setup();
		await Promise.all([service.load(canteen), service.load(canteen), service.load(canteen, { force: true })]);
		expect(state.calls).toBe(1);
	});

	it('rejects with a parse error for a canteen whose provider is not registered', async () => {
		const service = new MenuService({
			get: async () => ({ status: 200, text: '' }),
			providers: {},
			store: { get: () => undefined, set: async () => {} },
			now: () => 0,
		});
		await expect(service.load(canteen)).rejects.toMatchObject({ kind: 'parse' });
	});

	it('caches an empty feed as an empty plan, not as an error', async () => {
		const { state, service } = setup();
		state.result = [];
		const res = await service.load(canteen);
		expect(res).toMatchObject({ days: [], stale: false });
		expect(res.error).toBeUndefined();
	});

	it('loads once on Monday and then only from cache until the next Monday', async () => {
		const { state, service } = setup();
		await service.load(canteen);
		for (const d of [6, 7, 8, 9]) {
			state.now = at(2026, 10, d, 10);
			await service.load(canteen);
		}
		expect(state.calls).toBe(1);
		state.now = at(2026, 10, 12, 8);
		await service.load(canteen);
		expect(state.calls).toBe(2);
	});
});

describe('MenuService.verify', () => {
	it('succeeds for an empty plan and does not write to the cache', async () => {
		const { state, cache, service } = setup();
		state.result = [];
		await expect(service.verify(canteen)).resolves.toBeUndefined();
		expect(cache.size).toBe(0);
	});

	it('rejects when the provider fails', async () => {
		const { state, service } = setup();
		state.result = new ProviderError('parse', 'bad xml');
		await expect(service.verify(canteen)).rejects.toMatchObject({ kind: 'parse' });
	});
});
