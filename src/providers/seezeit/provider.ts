import { CanteenRef, HttpGet, MenuDay, MenuProvider } from '../../types';
import { fetchFeedText } from '../max-manager/feed';
import { parseSeezeitXml } from './parse';

export function seezeitXmlUrl(slug: string): string {
	return `https://www.max-manager.de/daten-extern/seezeit/xml/${slug}/speiseplan.xml`;
}

export const seezeitProvider: MenuProvider = {
	id: 'seezeit',
	async fetchDays(canteen: CanteenRef, get: HttpGet): Promise<MenuDay[]> {
		return parseSeezeitXml(await fetchFeedText(seezeitXmlUrl(canteen.ref), get));
	},
};
