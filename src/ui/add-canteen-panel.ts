import { setIcon } from 'obsidian';
import { parseAddInput } from '../catalog/add-input';
import { CanteenRef } from '../types';

interface AddPanelDeps {
	/** Probe-fetches the canteen; rejects if no readable menu comes back. */
	verify: (canteen: CanteenRef) => Promise<void>;
	onAdd: (canteen: CanteenRef) => void;
	onClose: () => void;
	isAdded: (id: string) => boolean;
}

export function renderAddCanteenPanel(parent: HTMLElement, deps: AddPanelDeps): void {
	const panel = parent.createDiv({ cls: 'canteen-add-panel' });

	const head = panel.createDiv({ cls: 'canteen-add-head' });
	head.createSpan({ cls: 'canteen-add-title', text: 'Add canteen' });
	const close = head.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Close' } });
	setIcon(close, 'x');
	close.addEventListener('click', deps.onClose);

	const input = panel.createEl('input', {
		type: 'text',
		cls: 'canteen-add-input',
		attr: { placeholder: 'Search by name, or paste a menu page URL', spellcheck: 'false' },
	});
	const results = panel.createDiv({ cls: 'canteen-add-results' });
	const status = panel.createDiv({ cls: 'canteen-add-status' });
	let busy = false;

	const add = async (canteen: CanteenRef) => {
		if (busy) return;
		busy = true;
		status.setText('Checking…');
		try {
			await deps.verify(canteen);
			deps.onAdd(canteen);
		} catch {
			// A failed probe says the source did not answer, not that the canteen does not exist.
			status.setText('Could not load a menu from this source. Check your connection or try again later.');
		} finally {
			busy = false;
		}
	};

	const row = (canteen: CanteenRef) => {
		const item = results.createDiv({ cls: 'canteen-add-row' });
		const text = item.createDiv({ cls: 'canteen-add-row-text' });
		text.createDiv({ text: canteen.city ? `${canteen.name} · ${canteen.city}` : canteen.name });
		text.createDiv({ cls: 'canteen-add-row-source', text: canteen.sourceName });
		const added = deps.isAdded(canteen.id);
		const button = item.createEl('button', { text: added ? 'Added' : 'Add' });
		button.disabled = added;
		button.addEventListener('click', () => void add(canteen));
	};

	input.addEventListener('input', () => {
		results.empty();
		status.empty();
		const parsed = parseAddInput(input.value);
		if (parsed.kind === 'search') {
			if (parsed.results.length === 0) status.setText('No canteen found. Paste the URL of its menu page instead.');
			parsed.results.forEach(row);
		} else if (parsed.kind === 'url') {
			if (parsed.canteen) row(parsed.canteen);
			else status.setText('This source is not supported yet. Search by name, or request support in the plugin repository.');
		}
	});
	input.focus();
}
