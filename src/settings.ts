import { CachedPlan } from './service/freshness';
import { CanteenRef, PROVIDER_IDS, PriceRole, ProviderId } from './types';

export interface CanteenSettings {
	favorites: CanteenRef[];
	selectedId?: string;
	/** Which price column the meal cards show. */
	priceRole: PriceRole;
	cache: Record<string, CachedPlan>;
}

export const DEFAULT_SETTINGS: CanteenSettings = {
	favorites: [],
	priceRole: 'student',
	cache: {},
};

const PRICE_ROLES: PriceRole[] = ['student', 'employee', 'guest'];

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';

function toCanteen(v: unknown): CanteenRef | undefined {
	if (!isDict(v)) return undefined;
	const { id, provider, ref, name, city, sourceName, sourceUrl } = v;
	if (![id, ref, name, city, sourceName, sourceUrl].every(isString)) return undefined;
	if (!PROVIDER_IDS.includes(provider as ProviderId)) return undefined;
	return { id, provider, ref, name, city, sourceName, sourceUrl } as CanteenRef;
}

function toPlan(v: unknown): CachedPlan | undefined {
	if (!isDict(v) || typeof v.fetchedAt !== 'number' || !Array.isArray(v.days)) return undefined;
	return { fetchedAt: v.fetchedAt, days: v.days as CachedPlan['days'] };
}

/** Defensive load of data.json: anything malformed falls back to defaults instead of crashing. */
export function normalizeSettings(raw: unknown): CanteenSettings {
	if (!isDict(raw)) return { ...DEFAULT_SETTINGS, favorites: [], cache: {} };

	const favorites = Array.isArray(raw.favorites)
		? raw.favorites.map(toCanteen).filter((c): c is CanteenRef => c !== undefined)
		: [];
	const cache: Record<string, CachedPlan> = {};
	if (isDict(raw.cache)) {
		for (const [id, value] of Object.entries(raw.cache)) {
			const plan = toPlan(value);
			if (plan) cache[id] = plan;
		}
	}
	const selectedId = isString(raw.selectedId) && favorites.some((f) => f.id === raw.selectedId) ? raw.selectedId : undefined;
	const priceRole = PRICE_ROLES.includes(raw.priceRole as PriceRole) ? (raw.priceRole as PriceRole) : DEFAULT_SETTINGS.priceRole;

	return { favorites, selectedId, priceRole, cache };
}

/** Removes a favorite together with its cached plan and keeps `selectedId` pointing at something that exists. */
export function removeFavorite(settings: CanteenSettings, id: string): void {
	if (!settings.favorites.some((f) => f.id === id)) return;
	settings.favorites = settings.favorites.filter((f) => f.id !== id);
	delete settings.cache[id];
	if (settings.selectedId === id) settings.selectedId = settings.favorites[0]?.id;
}

export function moveFavorite(settings: CanteenSettings, id: string, delta: 1 | -1): void {
	const index = settings.favorites.findIndex((f) => f.id === id);
	const target = index + delta;
	if (index < 0 || target < 0 || target >= settings.favorites.length) return;
	const list = [...settings.favorites];
	[list[index], list[target]] = [list[target] as CanteenRef, list[index] as CanteenRef];
	settings.favorites = list;
}
