import { describe, expect, it } from 'vitest';
import { CATALOG, searchCatalog } from './catalog';

describe('CATALOG', () => {
	it('contains the verified Seezeit locations and not the 404 one', () => {
		const refs = CATALOG.map((c) => c.ref);
		expect(refs).toEqual(
			expect.arrayContaining(['mensa_htwg', 'mensa_giessberg', 'mensa_friedrichshafen', 'mensa_weingarten', 'mensa_ravensburg']),
		);
		expect(refs).not.toContain('themenpark_abendessen');
	});

	it('has unique ids and the source info of its provider on every entry', () => {
		expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length);
		for (const c of CATALOG) {
			expect(c.id).toBe(`${c.provider}:${c.ref}`);
			if (c.provider === 'seezeit') {
				expect(c.sourceUrl).toBe(`https://seezeit.com/essen/speiseplaene/${c.ref.replace(/_/g, '-')}/`);
			} else {
				expect(c.sourceName).toBe('Studierendenwerk Erlangen-Nürnberg');
			}
		}
	});

	it('contains the verified Erlangen-Nürnberg canteens', () => {
		const refs = CATALOG.filter((c) => c.provider === 'fau').map((c) => c.ref);
		expect(refs).toEqual(expect.arrayContaining(['mensa-sued', 'mensa-lmp', 'mensa-ansbach', 'mensa-eichstaett']));
	});
});

describe('searchCatalog', () => {
	it('finds the HTWG canteen first for "htwg"', () => {
		expect(searchCatalog('htwg')[0]?.ref).toBe('mensa_htwg');
	});

	it('finds both Konstanz canteens for "konstanz"', () => {
		const refs = searchCatalog('konstanz').map((c) => c.ref);
		expect(refs).toEqual(expect.arrayContaining(['mensa_htwg', 'mensa_giessberg']));
	});

	it('returns every entry for the operator name "seezeit"', () => {
		expect(searchCatalog('seezeit')).toHaveLength(CATALOG.filter((c) => c.provider === 'seezeit').length);
	});

	it('finds the Erlangen canteens by university alias', () => {
		expect(searchCatalog('fau').map((c) => c.ref)).toEqual(expect.arrayContaining(['mensa-sued', 'mensa-lmp']));
		expect(searchCatalog('süd')[0]?.ref).toBe('mensa-sued');
	});

	it('matches aliases such as the university name', () => {
		expect(searchCatalog('universität konstanz').map((c) => c.ref)).toContain('mensa_giessberg');
		expect(searchCatalog('fallenbrunnen')[0]?.ref).toBe('mensa_friedrichshafen');
	});

	it('returns nothing for an empty or blank query', () => {
		expect(searchCatalog('')).toEqual([]);
		expect(searchCatalog('   ')).toEqual([]);
	});

	it('ignores case and surrounding whitespace', () => {
		expect(searchCatalog('HTWG ')).toEqual(searchCatalog('htwg'));
	});
});
