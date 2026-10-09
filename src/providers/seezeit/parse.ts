import { Diet, Meal, MenuDay } from '../../types';
import { maxManagerDateKey, parseFeed, RawItem, readPrices } from '../max-manager/feed';
import { describeCode } from './legend';

// Seezeit dialect of the Max Manager feed: numeric codes inline in the title, numeric icon codes.

// Seezeit icon codes confirmed against the vendor-neutral diet labels of
// third-party apps; 45-50 (meat/fish/bio) are not decoded yet, so they give no badge.
const ICON_VEGAN = '24';
const ICON_VEGETARIAN = '51';

const CODE_GROUP = /\(\s*(\d+[a-z]?(?:\s*,\s*\d+[a-z]?)*)\s*\)/g;

// Some titles end in an unparenthesised list ("... Brötchen 25a,25c,30"). Requiring a comma keeps
// a lone trailing number ("Menü 2") in the name.
const TRAILING_CODES = /\s+(\d+[a-z]?(?:\s*,\s*\d+[a-z]?)+)\s*$/;

export const seezeitDateKey = maxManagerDateKey;

function compareCodes(a: string, b: string): number {
	const na = parseInt(a, 10);
	const nb = parseInt(b, 10);
	return na !== nb ? na - nb : a.localeCompare(b);
}

export function cleanTitle(raw: string): { name: string; codes: string[] } {
	const codes = new Set<string>();
	const collect = (group: string): void => {
		for (const code of group.split(',')) codes.add(code.trim());
	};
	const stripped = raw
		.replace(CODE_GROUP, (_match, group: string) => {
			collect(group);
			return ' ';
		})
		.replace(TRAILING_CODES, (_match, group: string) => {
			collect(group);
			return '';
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

function parseItem(item: RawItem): Meal | undefined {
	const rawTitle = String(item.title ?? '').trim();
	if (!rawTitle) return undefined;
	const { name, codes } = cleanTitle(rawTitle);
	return {
		category: String(item.category ?? '').trim(),
		name,
		rawTitle,
		pricesCents: readPrices(item),
		diet: dietFromIcons(String(item.icons ?? '')),
		notes: codes.map(describeCode),
	};
}

export function parseSeezeitXml(xml: string): MenuDay[] {
	return parseFeed(xml, parseItem);
}
