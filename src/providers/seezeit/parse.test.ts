import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { ProviderError } from '../../types';
import { cleanTitle, dietFromIcons, parseSeezeitXml, seezeitDateKey } from './parse';

const fixture = readFileSync(new URL('../../../tests/fixtures/seezeit-htwg.xml', import.meta.url), 'utf8');

function xmlWithItem(inner: string, timestamp = 1791151200): string {
	return `<?xml version='1.0' encoding='utf-8'?><speiseplan><tag timestamp='${timestamp}'><item language='de'>${inner}</item></tag></speiseplan>`;
}

describe('seezeitDateKey', () => {
	const originalTz = process.env.TZ;
	afterEach(() => {
		if (originalTz === undefined) delete process.env.TZ;
		else process.env.TZ = originalTz;
	});

	it('maps a Berlin-midnight timestamp to its Berlin calendar day', () => {
		expect(seezeitDateKey(1791151200)).toBe('2026-10-05');
	});

	it('does not shift the day when the device is in Auckland', () => {
		process.env.TZ = 'Pacific/Auckland';
		expect(seezeitDateKey(1791151200)).toBe('2026-10-05');
	});

	it('does not shift the day when the device is in Los Angeles', () => {
		process.env.TZ = 'America/Los_Angeles';
		expect(seezeitDateKey(1791151200)).toBe('2026-10-05');
	});
});

describe('cleanTitle', () => {
	it('strips allergen/additive code groups and collects the codes', () => {
		const raw =
			'Hackbällchen (3,25a,28,33,34) mit Champignonrahmsauce (31) und Kartoffelpüree (3,31) dazu Blattsalat mit Frenchdressing (3,30,34,36)';
		expect(cleanTitle(raw)).toEqual({
			name: 'Hackbällchen mit Champignonrahmsauce und Kartoffelpüree dazu Blattsalat mit Frenchdressing',
			codes: ['3', '25a', '28', '30', '31', '33', '34', '36'],
		});
	});

	it('keeps parenthesised text that is not a code list', () => {
		expect(cleanTitle('Gemüse Curry mit Kokosmilch (Brokkoli, Bambussprossen, Paprika) (8) mit Reis')).toEqual({
			name: 'Gemüse Curry mit Kokosmilch (Brokkoli, Bambussprossen, Paprika) mit Reis',
			codes: ['8'],
		});
	});

	it('strips a bare trailing code list that has no parentheses', () => {
		expect(cleanTitle('Chili sin Carne Eintopf dazu Brötchen 25a,25c,30')).toEqual({
			name: 'Chili sin Carne Eintopf dazu Brötchen',
			codes: ['25a', '25c', '30'],
		});
	});

	it('keeps a lone trailing number, which is more likely part of the dish name', () => {
		expect(cleanTitle('Menü 2').name).toBe('Menü 2');
	});

	it('decodes a leftover &amp; and collapses double spaces', () => {
		const { name } = cleanTitle('[koeri]werk® Kalbs  oder vegane Currywurst (3) mit Sauce (33,34) &amp; Pommes');
		expect(name).toBe('[koeri]werk® Kalbs oder vegane Currywurst mit Sauce & Pommes');
	});
});

describe('dietFromIcons', () => {
	it('maps the lone vegan and vegetarian icons', () => {
		expect(dietFromIcons('24')).toEqual(['vegan']);
		expect(dietFromIcons('51')).toEqual(['vegetarian']);
	});

	it('gives no badge for variants ("calf or vegan"), meat icons or nothing', () => {
		expect(dietFromIcons('47,24')).toEqual([]);
		expect(dietFromIcons('45')).toEqual([]);
		expect(dietFromIcons('')).toEqual([]);
	});
});

describe('parseSeezeitXml', () => {
	it('parses the HTWG fixture into 10 days starting 2026-10-05', () => {
		const days = parseSeezeitXml(fixture);
		expect(days).toHaveLength(10);
		expect(days[0]?.date).toBe('2026-10-05');
	});

	it('maps category, price tiers (student/employee/guest) and title of the first meal', () => {
		const first = parseSeezeitXml(fixture)[0]?.meals[0];
		expect(first?.category).toBe('Seezeit-Teller');
		expect(first?.pricesCents).toEqual({ student: 440, employee: 590, guest: 870 });
		expect(first?.name.startsWith('Hackbällchen mit Champignonrahmsauce')).toBe(true);
	});

	it('marks the lone-vegan-icon dish as vegan', () => {
		const meals = parseSeezeitXml(fixture)[0]?.meals ?? [];
		const vegan = meals.find((m) => m.name.startsWith('Gemüse Curry'));
		expect(vegan?.diet).toEqual(['vegan']);
	});

	it('decodes the double-escaped ampersand in the real feed', () => {
		const meals = parseSeezeitXml(fixture)[0]?.meals ?? [];
		const wurst = meals.find((m) => m.category === 'koeriwerk');
		expect(wurst?.name).toContain('& Pommes');
		expect(wurst?.name).not.toContain('&amp;');
	});

	it('returns no days for an empty feed', () => {
		expect(parseSeezeitXml('<speiseplan></speiseplan>')).toEqual([]);
		expect(parseSeezeitXml("<?xml version='1.0'?><speiseplan/>")).toEqual([]);
	});

	it('omits an empty price instead of producing NaN', () => {
		const days = parseSeezeitXml(
			xmlWithItem(
				'<category>A</category><title>Reis</title><preis1>0,90</preis1><preis2>1,00</preis2><preis3></preis3>',
			),
		);
		const prices = days[0]?.meals[0]?.pricesCents;
		expect(prices).toEqual({ student: 90, employee: 100 });
	});

	it('skips items with an empty title', () => {
		const days = parseSeezeitXml(xmlWithItem('<category>A</category><title></title><preis1>1,00</preis1>'));
		expect(days[0]?.meals).toEqual([]);
	});

	it('copes with items without icons or prices', () => {
		const meal = parseSeezeitXml(xmlWithItem('<category>A</category><title>Salat</title>'))[0]?.meals[0];
		expect(meal?.diet).toEqual([]);
		expect(meal?.pricesCents).toEqual({});
	});

	it('takes codes from the title only, not from <kennzeichnungen>', () => {
		const meal = parseSeezeitXml(
			xmlWithItem(
				'<category>A</category><title>Curry (8) mit Reis</title><kennzeichnungen>8,24</kennzeichnungen><icons>24</icons>',
			),
		)[0]?.meals[0];
		expect(meal?.notes.map((n) => n.code)).toEqual(['8']);
	});

	it('throws a parse error for non-menu documents', () => {
		expect(() => parseSeezeitXml('<html>nope</html>')).toThrow(ProviderError);
		try {
			parseSeezeitXml('<html>nope</html>');
		} catch (e) {
			expect((e as ProviderError).kind).toBe('parse');
		}
	});
});
