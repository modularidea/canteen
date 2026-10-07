import { setIcon } from 'obsidian';
import { formatPrice } from '../format';
import { Meal, MealNote, PriceRole } from '../types';

const DIET_LABEL = { vegan: 'Vegan', vegetarian: 'Vegetarian' } as const;

function noteLine(parent: HTMLElement, title: string, notes: MealNote[]): void {
	if (notes.length === 0) return;
	const line = parent.createDiv({ cls: 'canteen-meal-note-line' });
	line.createSpan({ cls: 'canteen-meal-note-title', text: `${title}: ` });
	line.createSpan({ text: notes.map((n) => n.label).join(', ') });
}

/** One dish. Only the chosen price tier is shown; a missing price drops the line instead of falling back. */
export function renderMealCard(parent: HTMLElement, meal: Meal, role: PriceRole): HTMLElement {
	const card = parent.createDiv({ cls: 'canteen-meal' });
	const top = card.createDiv({ cls: 'canteen-meal-top' });
	top.createDiv({ cls: 'canteen-meal-name', text: meal.name });
	const price = meal.pricesCents[role];
	if (price !== undefined) top.createDiv({ cls: 'canteen-meal-price', text: formatPrice(price) });

	if (meal.diet.length > 0) {
		const badges = card.createDiv({ cls: 'canteen-meal-badges' });
		for (const diet of meal.diet) badges.createSpan({ cls: `canteen-badge is-${diet}`, text: DIET_LABEL[diet] });
	}

	if (meal.notes.length > 0) {
		const details = card.createEl('details', { cls: 'canteen-meal-notes' });
		// Icon + count instead of a repeated label; the full text stays reachable via aria-label/tooltip.
		const summary = details.createEl('summary', {
			cls: 'canteen-meal-notes-toggle',
			attr: { 'aria-label': 'Allergens and additives', title: 'Allergens and additives' },
		});
		setIcon(summary.createSpan({ cls: 'canteen-meal-notes-icon' }), 'info');
		summary.createSpan({ text: String(meal.notes.length) });
		noteLine(details, 'Allergens', meal.notes.filter((n) => n.kind === 'allergen'));
		noteLine(details, 'Additives', meal.notes.filter((n) => n.kind === 'additive'));
		noteLine(details, 'Other codes', meal.notes.filter((n) => n.kind === 'unknown'));
	}
	return card;
}
