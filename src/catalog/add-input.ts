import { CanteenRef } from '../types';
import { searchCatalog } from './catalog';
import { resolveCanteenUrl } from './resolve-url';

export type AddInput =
	| { kind: 'empty' }
	| { kind: 'search'; results: CanteenRef[] }
	| { kind: 'url'; canteen: CanteenRef | undefined };

/** One text field serves both ways to add a canteen: a pasted menu URL or a name search. */
export function parseAddInput(input: string): AddInput {
	const text = input.trim();
	if (!text) return { kind: 'empty' };
	if (/^https?:\/\//i.test(text)) return { kind: 'url', canteen: resolveCanteenUrl(text) };
	return { kind: 'search', results: searchCatalog(text) };
}
