import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ProviderError } from '../../types';
import { parseOpenMensaMeals } from './parse';

const fixture = readFileSync(new URL('../../../tests/fixtures/openmensa-meals.json', import.meta.url), 'utf8');

describe('parseOpenMensaMeals', () => {
	it('maps days, categories, prices and notes of the live sample', () => {
		const days = parseOpenMensaMeals(fixture);
		expect(days.map((d) => d.date)).toEqual(['2026-10-09', '2026-10-12']);
		const pasta = days[0]?.meals[0];
		expect(pasta?.name).toBe('Hausgemachte Pasta, Pesto Rosso');
		expect(pasta?.category).toBe('FRIENDS');
		expect(pasta?.pricesCents).toEqual({ student: 200, employee: 450, guest: 640 });
		expect(pasta?.diet).toEqual(['vegan']);
		expect(pasta?.notes).toEqual([
			{ code: 'vegan', label: 'vegan', kind: 'unknown' },
			{ code: 'mit Knoblauch', label: 'mit Knoblauch', kind: 'unknown' },
		]);
	});

	it('detects vegetarian meals and tolerates null prices', () => {
		const json = JSON.stringify([
			{ date: '2026-10-09', closed: false, meals: [{ name: 'Pudding', category: 'X', prices: { students: null }, notes: ['ohne Fleisch'] }] },
		]);
		const meal = parseOpenMensaMeals(json)[0]?.meals[0];
		expect(meal?.diet).toEqual(['vegetarian']);
		expect(meal?.pricesCents).toEqual({});
	});

	it('keeps a closed day as a day without meals, sorted by date', () => {
		const json = JSON.stringify([
			{ date: '2026-10-12', closed: true },
			{ date: '2026-10-09', closed: false, meals: [] },
		]);
		expect(parseOpenMensaMeals(json)).toEqual([
			{ date: '2026-10-09', meals: [] },
			{ date: '2026-10-12', meals: [] },
		]);
	});

	it('fails loudly on malformed input', () => {
		for (const bad of ['not json', '{}', '[{"closed":false}]']) {
			expect(() => parseOpenMensaMeals(bad)).toThrow(ProviderError);
		}
	});

	it('moves a warning appended to the dish name into its own field', () => {
		const json = JSON.stringify([
			{
				date: '2026-10-09',
				closed: false,
				meals: [
					{ name: 'Linsen mit Spätzle⚠️Bestellzeit abgelaufen', category: 'X', notes: [] },
					{ name: 'Salat', category: 'X', notes: [] },
					{ name: '⚠️Bestellzeit abgelaufen', category: 'X', notes: [] },
				],
			},
		]);
		const [lentils, salad, onlyWarning] = parseOpenMensaMeals(json)[0]?.meals ?? [];
		expect(lentils).toMatchObject({ name: 'Linsen mit Spätzle', warning: 'Bestellzeit abgelaufen' });
		expect(lentils?.rawTitle).toBe('Linsen mit Spätzle⚠️Bestellzeit abgelaufen');
		expect(salad?.warning).toBeUndefined();
		expect(onlyWarning?.name).toBe('⚠️Bestellzeit abgelaufen');
	});
});
