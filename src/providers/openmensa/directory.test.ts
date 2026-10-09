import { describe, expect, it } from 'vitest';
import { HttpGet } from '../../types';
import { OpenMensaDirectory } from './directory';

const LIST = [
	{ id: 1, name: 'Mensa Alpha', city: 'Konstanz', address: 'Weg 1, 78462 Konstanz' },
	{ id: 2, name: 'Mensa Beta', city: 'Konstanz', address: 'Weg 2' },
	{ id: 3, name: 'Mensa Gamma', city: 'Konstanz', address: 'Weg 3' },
	{ id: 4, name: 'Cafeteria Konstanz', city: 'Hamburg', address: '' },
];
const DAYS: Record<string, unknown> = {
	'1': [{ date: '2026-10-09', closed: false }],
	'2': [],
	'3': [{ date: '2026-10-01', closed: false }, { date: '2026-10-12', closed: true }],
	'4': [{ date: '2026-10-10', closed: false }],
};

function fakeGet(calls: string[] = []): HttpGet {
	return async (url) => {
		calls.push(url);
		if (url.includes('/canteens?')) {
			const page = Number(/page=(\d+)/.exec(url)?.[1]);
			return { status: 200, text: JSON.stringify(page === 1 ? LIST : []) };
		}
		const id = /canteens\/(\d+)\/days/.exec(url)?.[1] ?? '';
		return id in DAYS ? { status: 200, text: JSON.stringify(DAYS[id]) } : { status: 404, text: '' };
	};
}

describe('OpenMensaDirectory.search', () => {
	it('drops canteens without an upcoming open day', async () => {
		const dir = new OpenMensaDirectory(fakeGet(), () => '2026-10-09');
		const found = await dir.search('konstanz');
		// 2 has no days, 3 only a past and a closed day.
		expect(found.map((c) => c.id)).toEqual(['openmensa:4', 'openmensa:1']);
	});

	it('ranks name matches before city matches and fills source info', async () => {
		const dir = new OpenMensaDirectory(fakeGet(), () => '2026-10-09');
		const [first] = await dir.search('konstanz');
		expect(first).toMatchObject({ provider: 'openmensa', ref: '4', sourceName: 'OpenMensa', sourceUrl: 'https://openmensa.org/c/4' });
	});

	it('loads the directory and probes each canteen only once', async () => {
		const calls: string[] = [];
		const dir = new OpenMensaDirectory(fakeGet(calls), () => '2026-10-09');
		await dir.search('konstanz');
		await dir.search('mensa');
		expect(calls.filter((u) => u.includes('/canteens?'))).toHaveLength(1);
		expect(calls.filter((u) => u.includes('/canteens/1/days'))).toHaveLength(1);
	});

	it('treats a failing probe as "no data" and an empty query as no result', async () => {
		const get: HttpGet = async (url) =>
			url.includes('/canteens?') ? { status: 200, text: JSON.stringify(LIST.slice(0, 1)) } : { status: 500, text: '' };
		const dir = new OpenMensaDirectory(get, () => '2026-10-09');
		expect(await dir.search('mensa')).toEqual([]);
		expect(await dir.search('  ')).toEqual([]);
	});

	it('retries the directory after a failed load', async () => {
		let fail = true;
		const inner = fakeGet();
		const get: HttpGet = async (url) => (fail ? { status: 503, text: '' } : inner(url));
		const dir = new OpenMensaDirectory(get, () => '2026-10-09');
		await expect(dir.search('alpha')).rejects.toThrow();
		fail = false;
		expect((await dir.search('alpha')).map((c) => c.id)).toEqual(['openmensa:1']);
	});
});

describe('OpenMensaDirectory.lookup', () => {
	it('reads name and city of one canteen, or undefined on error', async () => {
		const get: HttpGet = async (url) =>
			url.endsWith('/canteens/1') ? { status: 200, text: JSON.stringify(LIST[0]) } : { status: 404, text: '' };
		const dir = new OpenMensaDirectory(get, () => '2026-10-09');
		expect((await dir.lookup('1'))?.name).toBe('Mensa Alpha');
		expect(await dir.lookup('99')).toBeUndefined();
	});
});
