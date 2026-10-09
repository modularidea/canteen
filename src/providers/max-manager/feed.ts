import { XMLParser } from 'fast-xml-parser';
import { HttpGet, Meal, MenuDay, PriceRole, ProviderError } from '../../types';

// Max Manager (infomax) serves several operators with the same envelope but different item
// dialects. This file holds the envelope; a dialect only turns one raw <item> into a Meal.
// The feed is undocumented, so everything fails loudly with ProviderError('parse') instead of
// silently returning an empty menu.

export type RawItem = Record<string, unknown>;

const PRICE_FIELDS: Array<[string, PriceRole]> = [
	['preis1', 'student'],
	['preis2', 'employee'],
	['preis3', 'guest'],
];

const berlinDay = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Berlin',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

/** Feed timestamps are Berlin midnight; format in Berlin time so the device zone cannot shift the day. */
export function maxManagerDateKey(timestampSec: number): string {
	return berlinDay.format(new Date(timestampSec * 1000));
}

function parseCents(value: unknown): number | undefined {
	const n = parseFloat(String(value ?? '').replace(',', '.'));
	return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

export function readPrices(item: RawItem): Partial<Record<PriceRole, number>> {
	const prices: Partial<Record<PriceRole, number>> = {};
	for (const [field, role] of PRICE_FIELDS) {
		const cents = parseCents(item[field]);
		if (cents !== undefined) prices[role] = cents;
	}
	return prices;
}

export async function fetchFeedText(url: string, get: HttpGet): Promise<string> {
	let response: { status: number; text: string };
	try {
		response = await get(url);
	} catch (e) {
		throw new ProviderError('network', `Could not reach the menu server: ${(e as Error).message}`);
	}
	if (response.status !== 200) {
		throw new ProviderError('http', `Menu server answered with HTTP ${response.status}`, response.status);
	}
	return response.text;
}

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	parseTagValue: false,
	trimValues: true,
	isArray: (name) => name === 'tag' || name === 'item',
});

export function parseFeed(xml: string, readItem: (item: RawItem) => Meal | undefined): MenuDay[] {
	let doc: Record<string, unknown>;
	try {
		doc = parser.parse(xml) as Record<string, unknown>;
	} catch (e) {
		throw new ProviderError('parse', `Menu feed is not valid XML: ${(e as Error).message}`);
	}
	if (!('speiseplan' in doc)) throw new ProviderError('parse', 'Menu feed has no <speiseplan> root');

	const root = doc.speiseplan;
	const tags = typeof root === 'object' && root !== null ? ((root as Record<string, unknown>).tag as RawItem[] | undefined) : undefined;

	const days: MenuDay[] = (tags ?? []).map((tag) => {
		const timestamp = Number(tag['@_timestamp']);
		if (!Number.isFinite(timestamp)) throw new ProviderError('parse', 'Menu feed day without a valid timestamp');
		const items = (tag.item as RawItem[] | undefined) ?? [];
		const meals = items.map(readItem).filter((m): m is Meal => m !== undefined);
		return { date: maxManagerDateKey(timestamp), meals };
	});
	return days.sort((a, b) => a.date.localeCompare(b.date));
}
