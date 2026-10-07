import { CanteenRef, HttpGet, MenuDay, MenuProvider, ProviderError } from '../../types';
import { parseSeezeitXml } from './parse';

export function seezeitXmlUrl(slug: string): string {
	return `https://www.max-manager.de/daten-extern/seezeit/xml/${slug}/speiseplan.xml`;
}

export const seezeitProvider: MenuProvider = {
	id: 'seezeit',
	async fetchDays(canteen: CanteenRef, get: HttpGet): Promise<MenuDay[]> {
		let response: { status: number; text: string };
		try {
			response = await get(seezeitXmlUrl(canteen.ref));
		} catch (e) {
			throw new ProviderError('network', `Could not reach the menu server: ${(e as Error).message}`);
		}
		if (response.status !== 200) {
			throw new ProviderError('http', `Menu server answered with HTTP ${response.status}`, response.status);
		}
		return parseSeezeitXml(response.text);
	},
};
