import { CanteenRef, HttpGet, MenuDay, MenuProvider, ProviderError, ProviderId } from '../types';
import { CachedPlan, isFresh } from './freshness';

export interface CacheStore {
	get(id: string): CachedPlan | undefined;
	set(id: string, plan: CachedPlan): Promise<void>;
}

export interface LoadResult {
	days: MenuDay[];
	fetchedAt: number;
	/** True when the fetch failed and the cached plan is shown instead. */
	stale: boolean;
	error?: ProviderError;
}

interface Deps {
	get: HttpGet;
	providers: Partial<Record<ProviderId, MenuProvider>>;
	store: CacheStore;
	now: () => number;
}

export class MenuService {
	private readonly inFlight = new Map<string, Promise<LoadResult>>();

	constructor(private readonly deps: Deps) {}

	load(canteen: CanteenRef, opts?: { force?: boolean }): Promise<LoadResult> {
		const running = this.inFlight.get(canteen.id);
		if (running) return running;

		const cached = this.deps.store.get(canteen.id);
		if (!opts?.force && cached && isFresh(cached, this.deps.now())) {
			return Promise.resolve({ days: cached.days, fetchedAt: cached.fetchedAt, stale: false });
		}

		const request = this.fetchAndStore(canteen, cached).finally(() => this.inFlight.delete(canteen.id));
		this.inFlight.set(canteen.id, request);
		return request;
	}

	/** Proves that a canteen reference yields a readable feed; an empty plan is valid. Never caches. */
	async verify(canteen: CanteenRef): Promise<void> {
		await this.providerFor(canteen).fetchDays(canteen, this.deps.get);
	}

	private providerFor(canteen: CanteenRef): MenuProvider {
		const provider = this.deps.providers[canteen.provider];
		if (!provider) throw new ProviderError('parse', `No provider registered for "${canteen.provider}"`);
		return provider;
	}

	private async fetchAndStore(canteen: CanteenRef, cached: CachedPlan | undefined): Promise<LoadResult> {
		try {
			const days = await this.providerFor(canteen).fetchDays(canteen, this.deps.get);
			const plan: CachedPlan = { fetchedAt: this.deps.now(), days };
			await this.deps.store.set(canteen.id, plan);
			return { days, fetchedAt: plan.fetchedAt, stale: false };
		} catch (e) {
			const error = e instanceof ProviderError ? e : new ProviderError('network', (e as Error).message);
			if (cached) return { days: cached.days, fetchedAt: cached.fetchedAt, stale: true, error };
			throw error;
		}
	}
}
