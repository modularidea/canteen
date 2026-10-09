import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ProviderError } from '../../types';
import { cleanFauTitle, dietFromPictograms, parseFauXml } from './parse';

const fixture = readFileSync(new URL('../../../tests/fixtures/fau-sued.xml', import.meta.url), 'utf8');

const pic = (...codes: string[]): string => codes.map((c) => `<img class='infomax-food-icon ${c}' alt='food-icon'>`).join('');

describe('cleanFauTitle', () => {
	it('strips abbreviation and number groups and collects the codes', () => {
		expect(cleanFauTitle('Hacksteak (Wz,Ei,Sen) mit Pilzrahmsoße (1,Wz,Mi,Ge) Kartoffelpüree (7,Mi,Su)')).toEqual({
			name: 'Hacksteak mit Pilzrahmsoße Kartoffelpüree',
			codes: ['1', '7', 'Ei', 'Ge', 'Mi', 'Sen', 'Su', 'Wz'],
		});
	});

	it('keeps parentheses that are not made of known codes in the dish name', () => {
		expect(cleanFauTitle('Gemüsepfanne (vegan) mit Reis (Wz)')).toEqual({ name: 'Gemüsepfanne (vegan) mit Reis', codes: ['Wz'] });
		expect(cleanFauTitle('Curry (Wz,Bio)')).toEqual({ name: 'Curry (Wz,Bio)', codes: [] });
	});

	it('returns a plain title unchanged', () => {
		expect(cleanFauTitle('Pommes frites')).toEqual({ name: 'Pommes frites', codes: [] });
	});
});

describe('dietFromPictograms', () => {
	it('reads vegan and vegetarian from the pictogram class names', () => {
		expect(dietFromPictograms(pic('V'))).toEqual(['vegan']);
		expect(dietFromPictograms(pic('Gf', 'veg'))).toEqual(['vegetarian']);
	});

	it('gives no badge for meat or missing pictograms', () => {
		expect(dietFromPictograms(pic('R', 'S'))).toEqual([]);
		expect(dietFromPictograms('')).toEqual([]);
	});
});

describe('parseFauXml', () => {
	const days = parseFauXml(fixture);

	it('parses every day of the live fixture with Berlin dates, sorted', () => {
		expect(days).toHaveLength(10);
		expect(days[0]?.date).toBe('2026-10-05');
		expect(days.map((d) => d.date)).toEqual([...days.map((d) => d.date)].sort());
	});

	it('reads the first meal completely', () => {
		const meal = days[0]?.meals[0];
		expect(meal?.category).toBe('Essen 1');
		expect(meal?.name).toBe('Hacksteak mit Pilzrahmsoße Kartoffelpüree');
		expect(meal?.pricesCents).toEqual({ student: 349, employee: 469, guest: 698 });
		expect(meal?.diet).toEqual([]);
		// Codes are shown as published: the operator's legend is not verified.
		expect(meal?.notes.every((n) => n.kind === 'unknown' && n.label === n.code)).toBe(true);
	});

	it('never exposes the photo field or nutrition values', () => {
		expect(JSON.stringify(days)).not.toMatch(/foto|kcal|eiweiss/);
	});

	it('returns no days for an empty feed', () => {
		expect(parseFauXml("<?xml version='1.0' encoding='utf-8'?><speiseplan/>")).toEqual([]);
	});

	it('throws a parse error for a page that is not a menu', () => {
		expect(() => parseFauXml('<html>nope</html>')).toThrow(ProviderError);
	});
});
