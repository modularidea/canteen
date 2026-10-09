import { openMensaCanteen } from '../providers/openmensa/directory';
import { CanteenRef } from '../types';
import { CATALOG, FAU_SOURCE_NAME, FAU_SOURCE_URL, SEEZEIT_SOURCE_NAME, seezeitPageUrl } from './catalog';

const SLUG = /^[a-z0-9_-]+$/;

interface Match {
	provider: CanteenRef['provider'];
	slug: string;
}

function matchUrl(url: URL): Match | undefined {
	const host = url.hostname.toLowerCase().replace(/^www\./, '');
	if (host === 'seezeit.com') {
		const slug = /^\/essen\/speiseplaene\/([^/]+)\/?$/.exec(url.pathname)?.[1];
		return slug ? { provider: 'seezeit', slug } : undefined;
	}
	if (host === 'max-manager.de') {
		const seezeit = /^\/daten-extern\/seezeit\/(?:pdf\/wochenplaene|xml)\/([^/]+)\//.exec(url.pathname)?.[1];
		if (seezeit) return { provider: 'seezeit', slug: seezeit };
		const fau = /^\/daten-extern\/sw-erlangen-nuernberg\/xml\/(?:en\/)?([^/]+?)\.xml$/.exec(url.pathname)?.[1];
		if (fau) return { provider: 'fau', slug: fau };
	}
	return undefined;
}

// "/c/<id>" is the public page, "/canteens/<id>" the API and legacy page path.
const OPENMENSA_PATH = /^\/(?:api\/v2\/)?(?:c|canteens)\/(\d+)(?:\/|$)/;

function provisionalName(ref: string): string {
	const words = ref.replace(/[_-]/g, ' ');
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Maps a pasted URL to a canteen. Unknown slugs yield a provisional entry: the caller must
 * probe-fetch it before saving, because a slug that fits the pattern may still not exist.
 */
export function resolveCanteenUrl(input: string): CanteenRef | undefined {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return undefined;
	}
	const match = matchUrl(url);
	const host = url.hostname.toLowerCase().replace(/^www\./, '');
	if (host === 'openmensa.org') {
		const id = OPENMENSA_PATH.exec(url.pathname)?.[1];
		// The name is unknown until the caller looks it up.
		return id ? openMensaCanteen(id, `OpenMensa #${id}`, '') : undefined;
	}
	const raw = match?.slug.toLowerCase();
	if (!match || !raw || !SLUG.test(raw)) return undefined;

	// Seezeit slugs use "_" in the feed and "-" on the website; FAU slugs are used as published.
	const ref = match.provider === 'seezeit' ? raw.replace(/-/g, '_') : raw;
	const known = CATALOG.find((c) => c.provider === match.provider && c.ref === ref);
	if (known) return known;
	return {
		id: `${match.provider}:${ref}`,
		provider: match.provider,
		ref,
		name: provisionalName(ref),
		city: '',
		sourceName: match.provider === 'seezeit' ? SEEZEIT_SOURCE_NAME : FAU_SOURCE_NAME,
		sourceUrl: match.provider === 'seezeit' ? seezeitPageUrl(ref) : FAU_SOURCE_URL,
	};
}
