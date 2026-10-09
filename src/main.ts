import { Plugin, requestUrl } from 'obsidian';
import { DEEPLINK_ACTION, findFavorite } from './deeplink';
import { fauProvider } from './providers/fau/provider';
import { OpenMensaDirectory } from './providers/openmensa/directory';
import { openMensaProvider } from './providers/openmensa/provider';
import { seezeitProvider } from './providers/seezeit/provider';
import { CachedPlan } from './service/freshness';
import { CacheStore, MenuService } from './service/menu-service';
import { CanteenSettings, normalizeSettings } from './settings';
import { CanteenSettingTab } from './settings-tab';
import { CanteenRef, HttpGet } from './types';
import { todayKey } from './view/day-select';
import { CANTEEN_VIEW_TYPE, CanteenMenuView, ViewHost } from './view/menu-view';

export default class CanteenMenuPlugin extends Plugin implements ViewHost {
	settings!: CanteenSettings;
	service!: MenuService;
	private openMensa!: OpenMensaDirectory;

	async onload() {
		this.settings = normalizeSettings(await this.loadData());

		// requestUrl instead of fetch: native HTTP on mobile, no CORS dependence on the operator's headers.
		const get: HttpGet = async (url) => {
			const res = await requestUrl({ url, throw: false, headers: { 'User-Agent': 'canteen-menu-obsidian-plugin' } });
			return { status: res.status, text: res.text };
		};
		const store: CacheStore = {
			get: (id) => this.settings.cache[id],
			set: async (id: string, plan: CachedPlan) => {
				this.settings.cache[id] = plan;
				await this.saveData(this.settings);
			},
		};
		this.service = new MenuService({ get, providers: { seezeit: seezeitProvider, fau: fauProvider, openmensa: openMensaProvider }, store, now: () => Date.now() });

		this.openMensa = new OpenMensaDirectory(get, () => todayKey(new Date()));

		this.registerView(CANTEEN_VIEW_TYPE, (leaf) => new CanteenMenuView(leaf, this));
		this.addRibbonIcon('utensils', 'Open canteen menu', () => {
			void this.activateView();
		});
		this.addCommand({
			id: 'open',
			name: 'Open menu',
			callback: () => {
				void this.activateView();
			},
		});
		// Deep link for shortcuts: obsidian://canteen-menu?vault=<name>[&canteen=<id or name>]
		this.registerObsidianProtocolHandler(DEEPLINK_ACTION, (params) => {
			void this.openFromLink(params.canteen);
		});
		this.addSettingTab(new CanteenSettingTab(this.app, this));
	}

	searchOpenMensa(query: string): Promise<CanteenRef[]> {
		return this.openMensa.search(query);
	}

	async lookupOpenMensa(canteen: CanteenRef): Promise<CanteenRef> {
		return (await this.openMensa.lookup(canteen.ref)) ?? canteen;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		for (const leaf of this.app.workspace.getLeavesOfType(CANTEEN_VIEW_TYPE)) {
			if (leaf.view instanceof CanteenMenuView) leaf.view.refresh();
		}
	}

	private async openFromLink(canteen: string | undefined): Promise<void> {
		await this.activateView();
		const match = findFavorite(this.settings.favorites, canteen);
		if (!match) return;
		for (const leaf of this.app.workspace.getLeavesOfType(CANTEEN_VIEW_TYPE)) {
			if (leaf.view instanceof CanteenMenuView) leaf.view.showCanteen(match.id);
		}
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(CANTEEN_VIEW_TYPE)[0];
		if (!leaf) {
			const right = workspace.getRightLeaf(false);
			if (!right) return;
			await right.setViewState({ type: CANTEEN_VIEW_TYPE, active: true });
			leaf = right;
		}
		await workspace.revealLeaf(leaf);
	}
}
