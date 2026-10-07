import { XMLParser } from 'fast-xml-parser';
import { Diet, Meal, MealNote, MenuDay, PriceRole, ProviderError } from '../../types';

// Seezeit publishes its plan through the Max Manager XML feed. The feed is
// undocumented, so everything here fails loudly with ProviderError('parse')
// instead of silently returning an empty menu.

const PRICE_FIELDS: Array<[string, PriceRole]> = [
	['preis1', 'student'],
	['preis2', 'employee'],
	['preis3', 'guest'],
];

// Seezeit icon codes confirmed against the vendor-neutral diet labels of
// third-party apps; 45-50 (meat/fish/bio) are not decoded yet, so they give no badge.
const ICON_VEGAN = '24';
const ICON_VEGETARIAN = '51';

const CODE_GROUP = /\(\s*(\d+[a-z]?(?:\s*,\s*\d+[a-z]?)*)\s*\)/g;

const berlinDay = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Berlin',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

/** Feed timestamps are Berlin midnight; format in Berlin time so the device zone cannot shift the day. */
export function seezeitDateKey(timestampSec: number): string {
	return berlinDay.format(new Date(timestampSec * 1000));
}

function compareCodes(a: string, b: string): number {
	const na = parseInt(a, 10);
	const nb = parseInt(b, 10);
	return na !== nb ? na - nb : a.localeCompare(b);
}

export function cleanTitle(raw: string): { name: string; codes: string[] } {
	const codes = new Set<string>();
	const stripped = raw.replace(CODE_GROUP, (_match, group: string) => {
		for (const code of group.split(',')) codes.add(code.trim());
		return ' ';
	});
	// The feed escapes "&" twice; the XML parser undid one level already.
	const name = stripped.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
	return { name, codes: [...codes].sort(compareCodes) };
}

export function dietFromIcons(icons: string): Diet[] {
	const codes = icons
		.split(',')
		.map((c) => c.trim())
		.filter(Boolean);
	// "47,24" means "calf or vegan": a badge would mislead, so only a lone code counts.
	if (codes.length !== 1) return [];
	if (codes[0] === ICON_VEGAN) return ['vegan'];
	if (codes[0] === ICON_VEGETARIAN) return ['vegetarian'];
	return [];
}

function parseCents(value: unknown): number | undefined {
	const n = parseFloat(String(value ?? '').replace(',', '.'));
	return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

function toNote(code: string): MealNote {
	return { code, label: code, kind: 'unknown' };
}

type RawItem = Record<string, unknown>;

function parseItem(item: RawItem): Meal | undefined {
	const rawTitle = String(item.title ?? '').trim();
	if (!rawTitle) return undefined;
	const { name, codes } = cleanTitle(rawTitle);
	const pricesCents: Partial<Record<PriceRole, number>> = {};
	for (const [field, role] of PRICE_FIELDS) {
		const cents = parseCents(item[field]);
		if (cents !== undefined) pricesCents[role] = cents;
	}
	return {
		category: String(item.category ?? '').trim(),
		name,
		rawTitle,
		pricesCents,
		diet: dietFromIcons(String(item.icons ?? '')),
		notes: codes.map(toNote),
	};
}

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	parseTagValue: false,
	trimValues: true,
	isArray: (name) => name === 'tag' || name === 'item',
});

export function parseSeezeitXml(xml: string): MenuDay[] {
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
		const meals = items.map(parseItem).filter((m): m is Meal => m !== undefined);
		return { date: seezeitDateKey(timestamp), meals };
	});
	return days.sort((a, b) => a.date.localeCompare(b.date));
}
