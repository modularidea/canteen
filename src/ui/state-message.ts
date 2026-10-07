import { formatAge } from '../format';
import { ProviderError } from '../types';

export type StateKind = 'loading' | 'empty' | 'error' | 'stale' | 'no-canteen';

export function errorMessage(error: ProviderError): string {
	switch (error.kind) {
		case 'network':
			return 'No connection, or the menu server is unreachable.';
		case 'http':
			return `The menu server answered with HTTP ${error.status ?? 'error'}.`;
		case 'parse':
			return 'The menu data could not be read. The format may have changed.';
	}
}

interface StateOptions {
	message?: string;
	sourceUrl?: string;
	fetchedAt?: number;
}

export function renderState(parent: HTMLElement, kind: StateKind, opts: StateOptions = {}): void {
	switch (kind) {
		case 'loading': {
			const skeleton = parent.createDiv({ cls: 'canteen-skeleton' });
			for (let i = 0; i < 3; i++) skeleton.createDiv({ cls: 'canteen-skeleton-line' });
			return;
		}
		case 'empty':
			parent.createDiv({ cls: 'canteen-state', text: opts.message ?? 'No menu published for this day.' });
			return;
		case 'no-canteen':
			parent.createDiv({ cls: 'canteen-state', text: opts.message ?? 'No canteen yet.' });
			return;
		case 'stale': {
			const age = opts.fetchedAt !== undefined ? formatAge(opts.fetchedAt, Date.now()) : 'earlier';
			parent.createDiv({
				cls: 'canteen-banner',
				text: `Showing data from ${age}. Could not refresh${opts.message ? `: ${opts.message}` : '.'}`,
			});
			return;
		}
		case 'error': {
			const box = parent.createDiv({ cls: 'canteen-state is-error' });
			box.createDiv({ text: opts.message ?? 'Could not load the menu.' });
			const url = opts.sourceUrl;
			if (url) {
				const button = box.createEl('button', { text: 'Open official page' });
				button.addEventListener('click', () => window.open(url));
			}
			return;
		}
	}
}
