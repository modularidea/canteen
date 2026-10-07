import { localDateKey } from '../service/freshness';
import { MenuDay } from '../types';

export function todayKey(now: Date): string {
	return localDateKey(now.getTime());
}

/** Today if the plan has it, else the next day with data, else the closest edge. */
export function pickDefaultDay(days: MenuDay[], today: string): string | undefined {
	if (days.length === 0) return undefined;
	const dates = days.map((d) => d.date);
	if (dates.includes(today)) return today;
	return dates.find((d) => d > today) ?? dates[dates.length - 1];
}

export function shiftDay(days: MenuDay[], current: string, delta: 1 | -1): string | undefined {
	const index = days.findIndex((d) => d.date === current);
	if (index < 0) return undefined;
	return days[index + delta]?.date;
}
