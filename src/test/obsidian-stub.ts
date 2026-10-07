// Test-only stand-in for the 'obsidian' package (types only, no runtime).
// Only Obsidian-free modules have unit tests; this keeps stray imports from
// failing resolution. Aliased in vitest.config.ts, never bundled.
export function requestUrl(): never {
	throw new Error('requestUrl is not available in tests');
}

export class Plugin {}
