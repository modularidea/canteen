import { LoadResult } from '../service/menu-service';

/**
 * True when a new load result is the same data the view already shows. A
 * cache hit hands out the same `days` array, so the DOM need not be rebuilt
 * (which would collapse open allergen sections on every focus change).
 */
export function sameResult(a: LoadResult | undefined, b: LoadResult | undefined): boolean {
	if (!a || !b) return a === b;
	return (
		a.days === b.days &&
		a.fetchedAt === b.fetchedAt &&
		a.stale === b.stale &&
		a.error?.kind === b.error?.kind &&
		a.error?.status === b.error?.status
	);
}
