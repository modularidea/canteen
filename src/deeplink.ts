import { CanteenRef } from './types';

export const DEEPLINK_ACTION = 'canteen-menu';

/** `obsidian://canteen-menu?vault=<name>[&canteen=<id or name>]`, usable as a macOS/iOS/Android shortcut. */
export function buildDeeplink(vaultName: string, canteen?: string): string {
	const query = new URLSearchParams({ vault: vaultName });
	if (canteen) query.set('canteen', canteen);
	// URLSearchParams writes spaces as "+", which Obsidian would not decode back.
	return `obsidian://${DEEPLINK_ACTION}?${query.toString().replace(/\+/g, '%20')}`;
}

/** Exact id first, then a case-insensitive name match, so both `fau:mensa-sued` and `Mensa Süd` work. */
export function findFavorite(favorites: CanteenRef[], query: string | undefined): CanteenRef | undefined {
	const needle = query?.trim().toLowerCase();
	if (!needle) return undefined;
	return (
		favorites.find((f) => f.id.toLowerCase() === needle) ??
		favorites.find((f) => f.name.toLowerCase() === needle) ??
		favorites.find((f) => f.name.toLowerCase().includes(needle))
	);
}
