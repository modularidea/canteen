import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HttpGet, ProviderError } from '../../types';
import { openMensaCanteen } from './directory';
import { openMensaMealsUrl, openMensaProvider } from './provider';

const fixture = readFileSync(new URL('../../../tests/fixtures/openmensa-meals.json', import.meta.url), 'utf8');
const canteen = openMensaCanteen(6, 'Mensa X', 'Y');

describe('openMensaProvider', () => {
	it('requests the meals endpoint of the canteen and parses it', async () => {
		const calls: string[] = [];
		const get: HttpGet = async (url) => {
			calls.push(url);
			return { status: 200, text: fixture };
		};
		const days = await openMensaProvider.fetchDays(canteen, get);
		expect(calls).toEqual([openMensaMealsUrl('6')]);
		expect(calls[0]).toBe('https://openmensa.org/api/v2/canteens/6/meals');
		expect(days).toHaveLength(2);
	});

	it('reports HTTP errors as ProviderError', async () => {
		const get: HttpGet = async () => ({ status: 404, text: '' });
		await expect(openMensaProvider.fetchDays(canteen, get)).rejects.toBeInstanceOf(ProviderError);
	});
});
