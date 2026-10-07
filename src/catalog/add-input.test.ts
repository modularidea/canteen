import { describe, expect, it } from 'vitest';
import { parseAddInput } from './add-input';

describe('parseAddInput', () => {
	it('treats empty or blank input as empty', () => {
		expect(parseAddInput('')).toEqual({ kind: 'empty' });
		expect(parseAddInput('   ')).toEqual({ kind: 'empty' });
	});

	it('searches the catalog for plain text', () => {
		const result = parseAddInput('htwg');
		expect(result.kind).toBe('search');
		if (result.kind === 'search') expect(result.results[0]?.ref).toBe('mensa_htwg');
	});

	it('returns an empty result list for text that matches nothing', () => {
		expect(parseAddInput('xyzzy')).toEqual({ kind: 'search', results: [] });
	});

	it('resolves a pasted Seezeit URL', () => {
		const result = parseAddInput(' https://seezeit.com/essen/speiseplaene/mensa-htwg/ ');
		expect(result.kind).toBe('url');
		if (result.kind === 'url') expect(result.canteen?.ref).toBe('mensa_htwg');
	});

	it('recognises a URL case-insensitively and reports unsupported sources', () => {
		expect(parseAddInput('HTTPS://example.com/menu')).toEqual({ kind: 'url', canteen: undefined });
	});
});
