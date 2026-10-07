import { setIcon } from 'obsidian';
import { formatDayLabel, formatWeekdayShort } from '../format';
import { MenuDay } from '../types';
import { shiftDay } from '../view/day-select';

function arrow(parent: HTMLElement, icon: string, label: string, target: string | undefined, onSelect: (date: string) => void): void {
	const button = parent.createEl('button', { cls: 'clickable-icon canteen-day-arrow', attr: { 'aria-label': label } });
	setIcon(button, icon);
	if (target === undefined) button.disabled = true;
	else button.addEventListener('click', () => onSelect(target));
}

export function renderDayBar(
	parent: HTMLElement,
	days: MenuDay[],
	selected: string,
	today: string,
	onSelect: (date: string) => void,
): void {
	const bar = parent.createDiv({ cls: 'canteen-daybar' });
	arrow(bar, 'chevron-left', 'Previous day', shiftDay(days, selected, -1), onSelect);

	const chips = bar.createDiv({ cls: 'canteen-day-chips' });
	for (const day of days) {
		const chip = chips.createEl('button', { cls: 'canteen-day-chip' });
		if (day.date === selected) chip.addClass('is-selected');
		if (day.date === today) chip.addClass('is-today');
		chip.createSpan({ cls: 'canteen-day-chip-weekday', text: formatWeekdayShort(day.date) });
		chip.createSpan({ cls: 'canteen-day-chip-date', text: formatDayLabel(day.date).short });
		chip.addEventListener('click', () => onSelect(day.date));
		if (day.date === selected) chip.scrollIntoView({ inline: 'center', block: 'nearest' });
	}

	arrow(bar, 'chevron-right', 'Next day', shiftDay(days, selected, 1), onSelect);
}
