import { CanteenRef, HttpGet } from '../../types';
import { OPENMENSA_API } from './provider';

export const OPENMENSA_SOURCE_NAME = 'OpenMensa';

const PAGE_SIZE = 100;
// Hard stop against a misbehaving server; the live directory has ~14 pages.
const MAX_PAGES = 50;
const RESULT_LIMIT = 10;
const CHECK_BATCH = 8;

interface DirectoryEntry {
	canteen: CanteenRef;
	haystack: string;
}

export function openMensaCanteen(id: string | number, name: string, city: string): CanteenRef {
	return {
		id: `openmensa:${id}`,
		provider: 'openmensa',
		ref: String(id),
		name,
		city,
		sourceName: OPENMENSA_SOURCE_NAME,
		sourceUrl: `https://openmensa.org/c/${id}`,
	};
}

function toEntry(raw: unknown): DirectoryEntry | undefined {
	if (typeof raw !== 'object' || raw === null) return undefined;
	const { id, name, city, address } = raw as Record<string, unknown>;
	if (typeof id !== 'number' || typeof name !== 'string') return undefined;
	const cityText = typeof city === 'string' ? city : '';
	const canteen = openMensaCanteen(id, name.trim(), cityText.trim());
	return { canteen, haystack: [name, cityText, typeof address === 'string' ? address : ''].join(' ').toLowerCase() };
}

async function getJson(url: string, get: HttpGet): Promise<unknown> {
	const res = await get(url);
	if (res.status !== 200) throw new Error(`OpenMensa answered with HTTP ${res.status}`);
	return JSON.parse(res.text) as unknown;
}

function nameScore(entry: DirectoryEntry, tokens: string[]): number {
	const name = entry.canteen.name.toLowerCase();
	return tokens.filter((t) => name.includes(t)).length;
}

/**
 * OpenMensa lists >1000 canteens, many of which have no menu data at all, and the list itself
 * carries no flag for that. So the directory is loaded once per session and every search
 * probes its best matches, dropping the ones without an upcoming open day.
 */
export class OpenMensaDirectory {
	private entries: Promise<DirectoryEntry[]> | undefined;
	private readonly hasData = new Map<string, Promise<boolean>>();

	constructor(
		private readonly get: HttpGet,
		private readonly today: () => string,
	) {}

	private loadEntries(): Promise<DirectoryEntry[]> {
		this.entries ??= this.fetchAll().catch((e: unknown) => {
			// Do not cache a failure: the next search retries.
			this.entries = undefined;
			throw e;
		});
		return this.entries;
	}

	private async fetchAll(): Promise<DirectoryEntry[]> {
		const all: DirectoryEntry[] = [];
		for (let page = 1; page <= MAX_PAGES; page++) {
			const list = await getJson(`${OPENMENSA_API}/canteens?limit=${PAGE_SIZE}&page=${page}`, this.get);
			if (!Array.isArray(list)) throw new Error('OpenMensa canteen list is not an array');
			for (const raw of list) {
				const entry = toEntry(raw);
				if (entry) all.push(entry);
			}
			if (list.length < PAGE_SIZE) break;
		}
		return all;
	}

	/** True if the canteen publishes at least one open day today or later. A failed probe counts as "no". */
	private canteenHasData(canteen: CanteenRef): Promise<boolean> {
		let known = this.hasData.get(canteen.id);
		if (!known) {
			known = getJson(`${OPENMENSA_API}/canteens/${canteen.ref}/days`, this.get).then(
				(days) => {
					const today = this.today();
					return (
						Array.isArray(days) &&
						days.some((d: unknown) => {
							const day = d as { date?: unknown; closed?: unknown };
							return typeof day.date === 'string' && day.date >= today && day.closed !== true;
						})
					);
				},
				() => false,
			);
			this.hasData.set(canteen.id, known);
		}
		return known;
	}

	/** Matches by name, city or address; canteens without upcoming menu data are filtered out. */
	async search(query: string): Promise<CanteenRef[]> {
		const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
		if (tokens.length === 0) return [];
		const matches = (await this.loadEntries()).filter((e) => tokens.every((t) => e.haystack.includes(t)));
		matches.sort((a, b) => nameScore(b, tokens) - nameScore(a, tokens));

		const found: CanteenRef[] = [];
		for (let i = 0; i < matches.length && found.length < RESULT_LIMIT; i += CHECK_BATCH) {
			const batch = matches.slice(i, i + CHECK_BATCH);
			const ok = await Promise.all(batch.map((e) => this.canteenHasData(e.canteen)));
			batch.forEach((e, k) => {
				if (ok[k] && found.length < RESULT_LIMIT) found.push(e.canteen);
			});
		}
		return found;
	}

	/** Reads name and city of one canteen, for a pasted OpenMensa URL. */
	async lookup(id: string): Promise<CanteenRef | undefined> {
		try {
			return toEntry(await getJson(`${OPENMENSA_API}/canteens/${id}`, this.get))?.canteen;
		} catch {
			return undefined;
		}
	}
}
