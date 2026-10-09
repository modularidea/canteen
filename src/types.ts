// Normalized domain model shared by every provider and the UI. Providers turn
// source-specific XML/JSON into these shapes; nothing downstream sees raw data.

export type PriceRole = 'student' | 'employee' | 'guest';

export type Diet = 'vegan' | 'vegetarian';

/** An allergen/additive code resolved to a display label by the provider. */
export interface MealNote {
	code: string;
	label: string;
	kind: 'allergen' | 'additive' | 'unknown';
}

export interface Meal {
	category: string;
	name: string;
	rawTitle: string;
	pricesCents: Partial<Record<PriceRole, number>>;
	diet: Diet[];
	notes: MealNote[];
}

export interface MenuDay {
	/** Local calendar day of the canteen, `YYYY-MM-DD`. */
	date: string;
	meals: Meal[];
}

export const PROVIDER_IDS = ['seezeit', 'fau', 'openmensa'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface CanteenRef {
	id: string;
	provider: ProviderId;
	/** Provider-specific identifier (e.g. the Seezeit location slug). */
	ref: string;
	name: string;
	city: string;
	sourceName: string;
	sourceUrl: string;
}

export type HttpGet = (url: string) => Promise<{ status: number; text: string }>;

export interface MenuProvider {
	readonly id: ProviderId;
	fetchDays(canteen: CanteenRef, get: HttpGet): Promise<MenuDay[]>;
}

export class ProviderError extends Error {
	constructor(
		readonly kind: 'network' | 'http' | 'parse',
		message: string,
		readonly status?: number,
	) {
		super(message);
		this.name = 'ProviderError';
	}
}
