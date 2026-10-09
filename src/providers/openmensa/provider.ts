import { CanteenRef, HttpGet, MenuDay, MenuProvider } from '../../types';
import { fetchFeedText } from '../max-manager/feed';
import { parseOpenMensaMeals } from './parse';

export const OPENMENSA_API = 'https://openmensa.org/api/v2';

export function openMensaMealsUrl(id: string): string {
	return `${OPENMENSA_API}/canteens/${id}/meals`;
}

export const openMensaProvider: MenuProvider = {
	id: 'openmensa',
	async fetchDays(canteen: CanteenRef, get: HttpGet): Promise<MenuDay[]> {
		return parseOpenMensaMeals(await fetchFeedText(openMensaMealsUrl(canteen.ref), get));
	},
};
