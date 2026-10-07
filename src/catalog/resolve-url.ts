import { CanteenRef } from '../types';
import { CATALOG, SEEZEIT_SOURCE_NAME, seezeitPageUrl } from './catalog';

const SLUG = /^[a-z0-9_-]+$/;

function slugFromUrl(url: URL): string | undefined {
	const host = url.hostname.toLowerCase().replace(/^www\./, '');
	if (host === 'seezeit.com') {
		return /^\/essen\/speiseplaene\/([^/]+)\/?$/.exec(url.pathname)?.[1];
	}
	if (host === 'max-manager.de') {
		return /^\/daten-extern\/seezeit\/(?:pdf\/wochenplaene|xml)\/([^/]+)\//.exec(url.pathname)?.[1];
	}
	return undefined;
}

function provisionalName(ref: string): string {
	const words = ref.replace(/_/g, ' ');
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Maps a pasted URL to a canteen. Unknown Seezeit slugs yield a provisional
 * entry: the caller must probe-fetch it before saving, because a slug that
 * fits the pattern may still not exist.
 */
export function resolveCanteenUrl(input: string): CanteenRef | undefined {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return undefined;
	}
	const raw = slugFromUrl(url)?.toLowerCase();
	if (!raw || !SLUG.test(raw)) return undefined;

	const ref = raw.replace(/-/g, '_');
	const known = CATALOG.find((c) => c.ref === ref);
	if (known) return known;
	return {
		id: `seezeit:${ref}`,
		provider: 'seezeit',
		ref,
		name: provisionalName(ref),
		city: '',
		sourceName: SEEZEIT_SOURCE_NAME,
		sourceUrl: seezeitPageUrl(ref),
	};
}
