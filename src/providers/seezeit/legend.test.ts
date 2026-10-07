import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { describeCode } from './legend';
import { parseSeezeitXml } from './parse';

describe('describeCode', () => {
	it('resolves an allergen code', () => {
		expect(describeCode('25a')).toEqual({ code: '25a', label: 'Weizen', kind: 'allergen' });
		expect(describeCode('31').label).toBe('Milch & Laktose');
	});

	it('resolves an additive code', () => {
		expect(describeCode('3')).toEqual({ code: '3', label: 'mit Antioxidationsmittel', kind: 'additive' });
	});

	it('keeps an unknown code visible as itself', () => {
		expect(describeCode('99')).toEqual({ code: '99', label: '99', kind: 'unknown' });
	});
});

// Seezeit prints these codes on its own menu page but defines them nowhere in
// its published legend; they must stay visible as raw codes, not be guessed.
const UNDEFINED_BY_OPERATOR = new Set(['19']);

describe('legend coverage against the real feed', () => {
	it('knows every code in the HTWG fixture titles except those the operator leaves undefined', () => {
		const xml = readFileSync(new URL('../../../tests/fixtures/seezeit-htwg.xml', import.meta.url), 'utf8');
		const unknown = parseSeezeitXml(xml)
			.flatMap((d) => d.meals)
			.flatMap((m) => m.notes)
			.filter((n) => n.kind === 'unknown')
			.map((n) => n.code)
			.filter((code) => !UNDEFINED_BY_OPERATOR.has(code));
		expect(new Set(unknown)).toEqual(new Set());
	});
});
