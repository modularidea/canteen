import { Diet, Meal, MenuDay, PriceRole, ProviderError } from '../../types';

// OpenMensa API v2 (https://doc.openmensa.org/api/v2). Notes are free text chosen by each
// community parser, so none is translated: every note is shown as published (kind 'unknown').

const PRICE_FIELDS: Array<[string, PriceRole]> = [
	['students', 'student'],
	['employees', 'employee'],
	['others', 'guest'],
];

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);

function readPrices(prices: unknown): Meal['pricesCents'] {
	const result: Meal['pricesCents'] = {};
	if (!isDict(prices)) return result;
	for (const [field, role] of PRICE_FIELDS) {
		const euro = prices[field];
		if (typeof euro === 'number' && Number.isFinite(euro)) result[role] = Math.round(euro * 100);
	}
	return result;
}

function dietFromNotes(notes: string[]): Diet[] {
	const lower = notes.map((n) => n.toLowerCase());
	if (lower.includes('vegan')) return ['vegan'];
	if (lower.some((n) => n === 'vegetarisch' || n === 'vegetarian' || n === 'ohne fleisch')) return ['vegetarian'];
	return [];
}

function parseMeal(raw: unknown): Meal | undefined {
	if (!isDict(raw)) return undefined;
	const name = typeof raw.name === 'string' ? raw.name.trim() : '';
	if (!name) return undefined;
	const notes = Array.isArray(raw.notes) ? raw.notes.filter((n): n is string => typeof n === 'string' && n.trim() !== '') : [];
	return {
		category: typeof raw.category === 'string' ? raw.category.trim() : '',
		name,
		rawTitle: name,
		pricesCents: readPrices(raw.prices),
		diet: dietFromNotes(notes),
		notes: notes.map((n) => ({ code: n, label: n, kind: 'unknown' as const })),
	};
}

/** Parses the response of `GET /canteens/{id}/meals`. Closed days are kept as days without meals. */
export function parseOpenMensaMeals(json: string): MenuDay[] {
	let doc: unknown;
	try {
		doc = JSON.parse(json);
	} catch (e) {
		throw new ProviderError('parse', `Menu feed is not valid JSON: ${(e as Error).message}`);
	}
	if (!Array.isArray(doc)) throw new ProviderError('parse', 'Menu feed is not a list of days');

	const days: MenuDay[] = [];
	for (const entry of doc) {
		if (!isDict(entry) || typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
			throw new ProviderError('parse', 'Menu feed day without a valid date');
		}
		const meals = Array.isArray(entry.meals) ? entry.meals.map(parseMeal).filter((m): m is Meal => m !== undefined) : [];
		days.push({ date: entry.date, meals });
	}
	return days.sort((a, b) => a.date.localeCompare(b.date));
}
