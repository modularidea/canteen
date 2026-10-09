import { CanteenRef } from '../types';

export const SEEZEIT_SOURCE_NAME = 'Seezeit Studierendenwerk Bodensee';

export function seezeitPageUrl(slug: string): string {
	return `https://seezeit.com/essen/speiseplaene/${slug.replace(/_/g, '-')}/`;
}

function seezeit(ref: string, name: string, city: string): CanteenRef {
	return {
		id: `seezeit:${ref}`,
		provider: 'seezeit',
		ref,
		name,
		city,
		sourceName: SEEZEIT_SOURCE_NAME,
		sourceUrl: seezeitPageUrl(ref),
	};
}

export const FAU_SOURCE_NAME = 'Studierendenwerk Erlangen-Nürnberg';
// The operator's per-canteen page paths are not verified, so the source link goes to its site.
export const FAU_SOURCE_URL = 'https://www.werkswelt.de/';

function fau(ref: string, name: string, city: string): CanteenRef {
	return {
		id: `fau:${ref}`,
		provider: 'fau',
		ref,
		name,
		city,
		sourceName: FAU_SOURCE_NAME,
		sourceUrl: FAU_SOURCE_URL,
	};
}

interface CatalogEntry {
	canteen: CanteenRef;
	aliases: string[];
}

// Only locations whose Max Manager feed answered 200 text/xml on 2026-10-07.
// ("themenpark_abendessen" from older sources returns 404 and is left out.)
const ENTRIES: CatalogEntry[] = [
	{ canteen: seezeit('mensa_htwg', 'Mensa HTWG', 'Konstanz'), aliases: ['htwg', 'hochschule konstanz'] },
	{ canteen: seezeit('mensa_giessberg', 'Mensa Gießberg', 'Konstanz'), aliases: ['universität konstanz', 'uni konstanz'] },
	{ canteen: seezeit('mensa_friedrichshafen', 'Mensa Fallenbrunnen', 'Friedrichshafen'), aliases: ['dhbw', 'duale hochschule'] },
	{ canteen: seezeit('mensa_weingarten', 'Mensa Weingarten', 'Weingarten'), aliases: ['hochschule weingarten', 'ph weingarten'] },
	{ canteen: seezeit('mensa_ravensburg', 'Mensa Ravensburg', 'Ravensburg'), aliases: ['dhbw', 'duale hochschule'] },
	// Canteens of the Erlangen-Nürnberg feed (answered 200 on 2026-10-08). Cafeterias and the
	// remaining slugs are reachable by pasting the feed URL until their names are confirmed.
	{ canteen: fau('mensa-sued', 'Mensa Süd', 'Erlangen'), aliases: ['fau', 'uni erlangen', 'universität erlangen'] },
	{ canteen: fau('mensa-lmp', 'Mensa Langemarckplatz', 'Erlangen'), aliases: ['lmp', 'fau', 'uni erlangen', 'universität erlangen'] },
	{ canteen: fau('mensa-inselschuett', 'Mensa Insel Schütt', 'Nürnberg'), aliases: ['inselschütt', 'th nürnberg', 'technische hochschule nürnberg'] },
	{ canteen: fau('mensa-regensburgerstr', 'Mensa Regensburger Straße', 'Nürnberg'), aliases: ['th nürnberg', 'technische hochschule nürnberg'] },
	{ canteen: fau('mensa-ansbach', 'Mensa Ansbach', 'Ansbach'), aliases: ['hochschule ansbach'] },
	{ canteen: fau('mensa-eichstaett', 'Mensa Eichstätt', 'Eichstätt'), aliases: ['eichstaett', 'ku eichstätt', 'katholische universität'] },
	{ canteen: fau('mensa-ingolstadt', 'Mensa Ingolstadt', 'Ingolstadt'), aliases: ['thi', 'th ingolstadt', 'technische hochschule ingolstadt'] },
];

export const CATALOG: CanteenRef[] = ENTRIES.map((e) => e.canteen);

export function searchCatalog(query: string): CanteenRef[] {
	const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return [];

	const scored: Array<{ canteen: CanteenRef; score: number }> = [];
	for (const { canteen, aliases } of ENTRIES) {
		const name = canteen.name.toLowerCase();
		const haystack = [name, canteen.city, canteen.sourceName, ...aliases].join(' ').toLowerCase();
		if (!tokens.every((t) => haystack.includes(t))) continue;
		const inName = tokens.filter((t) => name.includes(t) || aliases.some((a) => a === t)).length;
		scored.push({ canteen, score: inName });
	}
	// Array.prototype.sort is stable, so equal scores keep catalog order.
	return scored.sort((a, b) => b.score - a.score).map((s) => s.canteen);
}
