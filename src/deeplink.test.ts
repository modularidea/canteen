import { describe, expect, it } from 'vitest';
import { CanteenRef } from './types';
import { buildDeeplink, findFavorite } from './deeplink';

const canteen = (id: string, name: string): CanteenRef => ({
	id,
	provider: 'fau',
	ref: id.split(':')[1] ?? id,
	name,
	city: '',
	sourceName: '',
	sourceUrl: '',
});
const favorites = [canteen('seezeit:mensa_htwg', 'Mensa HTWG'), canteen('fau:mensa-sued', 'Mensa Süd')];

describe('buildDeeplink', () => {
	it('encodes the vault name with %20, not "+"', () => {
		expect(buildDeeplink('My Vault')).toBe('obsidian://canteen-menu?vault=My%20Vault');
	});

	it('adds the canteen when given', () => {
		expect(buildDeeplink('V', 'fau:mensa-sued')).toBe('obsidian://canteen-menu?vault=V&canteen=fau%3Amensa-sued');
	});
});

describe('findFavorite', () => {
	it('matches by id, then by name, ignoring case', () => {
		expect(findFavorite(favorites, 'fau:mensa-sued')?.name).toBe('Mensa Süd');
		expect(findFavorite(favorites, 'MENSA HTWG')?.id).toBe('seezeit:mensa_htwg');
		expect(findFavorite(favorites, 'süd')?.id).toBe('fau:mensa-sued');
	});

	it('returns undefined for no query or no match', () => {
		expect(findFavorite(favorites, undefined)).toBeUndefined();
		expect(findFavorite(favorites, '  ')).toBeUndefined();
		expect(findFavorite(favorites, 'dresden')).toBeUndefined();
	});
});
