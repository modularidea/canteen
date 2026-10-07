import { describe, expect, it } from 'vitest';
import { requestUrl } from './test/obsidian-stub';

describe('test setup', () => {
	it('runs vitest with the obsidian stub aliased', () => {
		expect(1 + 1).toBe(2);
		expect(() => requestUrl()).toThrow('not available in tests');
	});
});
