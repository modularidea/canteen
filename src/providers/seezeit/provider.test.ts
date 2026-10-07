import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CanteenRef, HttpGet, ProviderError } from '../../types';
import { seezeitProvider, seezeitXmlUrl } from './provider';

const fixture = readFileSync(new URL('../../../tests/fixtures/seezeit-htwg.xml', import.meta.url), 'utf8');

const htwg: CanteenRef = {
	id: 'seezeit:mensa_htwg',
	provider: 'seezeit',
	ref: 'mensa_htwg',
	name: 'Mensa HTWG',
	city: 'Konstanz',
	sourceName: 'Seezeit Studierendenwerk Bodensee',
	sourceUrl: 'https://seezeit.com/essen/speiseplaene/mensa-htwg/',
};

async function errorOf(promise: Promise<unknown>): Promise<ProviderError> {
	try {
		await promise;
	} catch (e) {
		return e as ProviderError;
	}
	throw new Error('expected a rejection');
}

describe('seezeitXmlUrl', () => {
	it('builds the Max Manager feed URL for a location slug', () => {
		expect(seezeitXmlUrl('mensa_htwg')).toBe(
			'https://www.max-manager.de/daten-extern/seezeit/xml/mensa_htwg/speiseplan.xml',
		);
	});
});

describe('seezeitProvider.fetchDays', () => {
	it('requests exactly one URL and parses the feed', async () => {
		const calls: string[] = [];
		const get: HttpGet = async (url) => {
			calls.push(url);
			return { status: 200, text: fixture };
		};
		const days = await seezeitProvider.fetchDays(htwg, get);
		expect(calls).toEqual([seezeitXmlUrl('mensa_htwg')]);
		expect(days).toHaveLength(10);
	});

	it('maps HTTP 404 and 403 to an http error carrying the status', async () => {
		for (const status of [404, 403]) {
			const err = await errorOf(seezeitProvider.fetchDays(htwg, async () => ({ status, text: '' })));
			expect(err).toBeInstanceOf(ProviderError);
			expect(err.kind).toBe('http');
			expect(err.status).toBe(status);
		}
	});

	it('maps a thrown request to a network error', async () => {
		const err = await errorOf(
			seezeitProvider.fetchDays(htwg, async () => {
				throw new Error('offline');
			}),
		);
		expect(err.kind).toBe('network');
	});

	it('maps a 200 response that is not a menu to a parse error', async () => {
		const err = await errorOf(seezeitProvider.fetchDays(htwg, async () => ({ status: 200, text: '<html>nope</html>' })));
		expect(err.kind).toBe('parse');
	});
});
