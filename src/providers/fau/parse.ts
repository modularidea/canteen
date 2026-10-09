import { Diet, Meal, MenuDay, MealNote } from '../../types';
import { parseFeed, RawItem, readPrices } from '../max-manager/feed';

// Dialect of the Studierendenwerk Erlangen-Nürnberg feed: codes are inline in the title as
// abbreviations ("Wz,Ei,Sen") mixed with numbers, pictograms come as an HTML string.
//
// The operator's legend could not be verified, so no code is translated: every code is shown
// as published (kind 'unknown'), never guessed. Add labels to LEGEND once confirmed.
const LEGEND: Record<string, { label: string; kind: 'allergen' | 'additive' }> = {};

// Only these abbreviations are taken out of the title: they all occur in the live feed. A
// parenthesis with anything else ("(vegan)", "(mild)") stays part of the dish name.
const KNOWN_ABBREVIATIONS = new Set(['Wz', 'Ei', 'Mi', 'Sen', 'Sel', 'Ses', 'So', 'Su', 'Ge', 'Gf', 'Fi', 'Man', 'Wa', 'R', 'S']);

const CODE_GROUP = /\(\s*([A-Za-z0-9]+(?:\s*,\s*[A-Za-z0-9]+)*)\s*\)/g;

const isCode = (token: string): boolean => /^\d+[a-z]?$/.test(token) || KNOWN_ABBREVIATIONS.has(token);

function compareCodes(a: string, b: string): number {
	const na = parseInt(a, 10);
	const nb = parseInt(b, 10);
	const aNum = Number.isFinite(na);
	const bNum = Number.isFinite(nb);
	if (aNum && bNum) return na !== nb ? na - nb : a.localeCompare(b);
	if (aNum !== bNum) return aNum ? -1 : 1;
	return a.localeCompare(b);
}

export function cleanFauTitle(raw: string): { name: string; codes: string[] } {
	const codes = new Set<string>();
	const stripped = raw.replace(CODE_GROUP, (match, group: string) => {
		const tokens = group.split(',').map((t) => t.trim());
		if (!tokens.every(isCode)) return match;
		for (const token of tokens) codes.add(token);
		return ' ';
	});
	// The feed escapes "&" twice; the XML parser undid one level already.
	const name = stripped.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
	return { name, codes: [...codes].sort(compareCodes) };
}

export function pictogramCodes(html: string): string[] {
	return [...html.matchAll(/infomax-food-icon\s+([A-Za-z0-9]+)/g)].map((m) => m[1] as string);
}

export function dietFromPictograms(html: string): Diet[] {
	const codes = pictogramCodes(html);
	if (codes.includes('V')) return ['vegan'];
	if (codes.includes('veg')) return ['vegetarian'];
	return [];
}

function describeFauCode(code: string): MealNote {
	const entry = LEGEND[code];
	return entry ? { code, label: entry.label, kind: entry.kind } : { code, label: code, kind: 'unknown' };
}

function parseItem(item: RawItem): Meal | undefined {
	const rawTitle = String(item.title ?? '').trim();
	if (!rawTitle) return undefined;
	const { name, codes } = cleanFauTitle(rawTitle);
	return {
		category: String(item.category ?? '').trim(),
		name,
		rawTitle,
		pricesCents: readPrices(item),
		diet: dietFromPictograms(String(item.piktogramme ?? '')),
		notes: codes.map(describeFauCode),
	};
}

export function parseFauXml(xml: string): MenuDay[] {
	return parseFeed(xml, parseItem);
}
