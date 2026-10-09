import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CanteenRef, HttpGet, ProviderError } from '../../types';
import { fauProvider, fauXmlUrl } from './provider';

const fixture = readFileSync(new URL('../../../tests/fixtures/fau-sued.xml', import.meta.url), 'utf8');

const sued: CanteenRef = {
	id: 'fau:mensa-sued',
	provider: 'fau',
	ref: 'mensa-sued',
	name: 'Mensa Süd',
	city: 'Erlangen',
	sourceName: 'Studierendenwerk Erlangen-Nürnberg',
	sourceUrl: 'https://www.werkswelt.de/',
};

async function errorOf(promise: Promise<unknown>): Promise<ProviderError> {
	try {
		await promise;
	} catch (e) {
		return e as ProviderError;
	}
	throw new Error('expected a rejection');
}

describe('fauProvider', () => {
	it('requests exactly the feed URL of the location and parses it', async () => {
		const calls: string[] = [];
		const get: HttpGet = async (url) => {
			calls.push(url);
			return { status: 200, text: fixture };
		};
		const days = await fauProvider.fetchDays(sued, get);
		expect(calls).toEqual(['https://www.max-manager.de/daten-extern/sw-erlangen-nuernberg/xml/mensa-sued.xml']);
		expect(fauXmlUrl('mensa-sued')).toBe(calls[0]);
		expect(days).toHaveLength(10);
	});

	it('maps HTTP errors and network failures to ProviderError kinds', async () => {
		const http = await errorOf(fauProvider.fetchDays(sued, async () => ({ status: 404, text: '' })));
		expect([http.kind, http.status]).toEqual(['http', 404]);
		const net = await errorOf(
			fauProvider.fetchDays(sued, async () => {
				throw new Error('offline');
			}),
		);
		expect(net.kind).toBe('network');
	});
});
