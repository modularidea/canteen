import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { resolveCanteenUrl } from './resolve-url';

const htwg = CATALOG.find((c) => c.ref === 'mensa_htwg');

describe('resolveCanteenUrl', () => {
	it('resolves a Seezeit menu page URL to the catalog entry', () => {
		expect(resolveCanteenUrl('https://seezeit.com/essen/speiseplaene/mensa-htwg/')).toEqual(htwg);
	});

	it('tolerates a missing trailing slash, a query string, www and http', () => {
		expect(resolveCanteenUrl('https://seezeit.com/essen/speiseplaene/mensa-htwg')).toEqual(htwg);
		expect(resolveCanteenUrl('https://seezeit.com/essen/speiseplaene/mensa-htwg/?x=1')).toEqual(htwg);
		expect(resolveCanteenUrl('http://www.seezeit.com/essen/speiseplaene/mensa-htwg/')).toEqual(htwg);
		expect(resolveCanteenUrl('  https://seezeit.com/essen/speiseplaene/mensa-htwg/  ')).toEqual(htwg);
	});

	it('resolves Max Manager PDF and XML URLs of the same location', () => {
		expect(
			resolveCanteenUrl('https://www.max-manager.de/daten-extern/seezeit/pdf/wochenplaene/mensa_htwg/aktuell.pdf?t=1'),
		).toEqual(htwg);
		expect(
			resolveCanteenUrl('https://www.max-manager.de/daten-extern/seezeit/xml/mensa_htwg/speiseplan.xml'),
		).toEqual(htwg);
	});

	it('builds a provisional entry for an unknown Seezeit slug (verified later by a probe fetch)', () => {
		expect(resolveCanteenUrl('https://seezeit.com/essen/speiseplaene/mensa-neu/')).toEqual({
			id: 'seezeit:mensa_neu',
			provider: 'seezeit',
			ref: 'mensa_neu',
			name: 'Mensa neu',
			city: '',
			sourceName: 'Seezeit Studierendenwerk Bodensee',
			sourceUrl: 'https://seezeit.com/essen/speiseplaene/mensa-neu/',
		});
	});

	it('resolves an Erlangen-Nürnberg feed URL to the catalog entry, also the English variant', () => {
		const sued = CATALOG.find((c) => c.id === 'fau:mensa-sued');
		const base = 'https://www.max-manager.de/daten-extern/sw-erlangen-nuernberg/xml';
		expect(resolveCanteenUrl(`${base}/mensa-sued.xml`)).toEqual(sued);
		expect(resolveCanteenUrl(`${base}/en/mensa-sued.xml`)).toEqual(sued);
	});

	it('builds a provisional entry for an unknown Erlangen-Nürnberg slug and keeps its hyphens', () => {
		expect(
			resolveCanteenUrl('https://www.max-manager.de/daten-extern/sw-erlangen-nuernberg/xml/cafeteria-chemikum.xml'),
		).toEqual({
			id: 'fau:cafeteria-chemikum',
			provider: 'fau',
			ref: 'cafeteria-chemikum',
			name: 'Cafeteria chemikum',
			city: '',
			sourceName: 'Studierendenwerk Erlangen-Nürnberg',
			sourceUrl: 'https://www.werkswelt.de/',
		});
	});

	it('returns undefined for anything else', () => {
		expect(resolveCanteenUrl('https://example.com/')).toBeUndefined();
		expect(resolveCanteenUrl('https://seezeit.com/')).toBeUndefined();
		expect(resolveCanteenUrl('mensa')).toBeUndefined();
		expect(resolveCanteenUrl('')).toBeUndefined();
	});

	it('resolves OpenMensa page and API URLs to a provisional entry', () => {
		for (const url of ['https://openmensa.org/c/6', 'https://openmensa.org/c/6/', 'https://openmensa.org/api/v2/canteens/6/days', 'http://www.openmensa.org/canteens/6']) {
			expect(resolveCanteenUrl(url)).toMatchObject({ id: 'openmensa:6', provider: 'openmensa', ref: '6', sourceUrl: 'https://openmensa.org/c/6' });
		}
		expect(resolveCanteenUrl('https://openmensa.org/')).toBeUndefined();
	});
});
