import { CanteenRef, HttpGet, MenuDay, MenuProvider } from '../../types';
import { fetchFeedText } from '../max-manager/feed';
import { parseFauXml } from './parse';

export function fauXmlUrl(slug: string): string {
	return `https://www.max-manager.de/daten-extern/sw-erlangen-nuernberg/xml/${slug}.xml`;
}

export const fauProvider: MenuProvider = {
	id: 'fau',
	async fetchDays(canteen: CanteenRef, get: HttpGet): Promise<MenuDay[]> {
		return parseFauXml(await fetchFeedText(fauXmlUrl(canteen.ref), get));
	},
};
