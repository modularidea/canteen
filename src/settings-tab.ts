import { App, Notice, Plugin, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import { buildDeeplink } from './deeplink';
import { CanteenSettings, removeFavorite, reorderFavorite } from './settings';
import { PriceRole } from './types';

interface SettingsHost extends Plugin {
	settings: CanteenSettings;
	saveSettings(): Promise<void>;
}

export class CanteenSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly host: SettingsHost) {
		super(app, host);
	}

	// Declarative settings (Obsidian 1.13+): searchable and drag-to-reorder.
	getSettingDefinitions(): SettingDefinitionItem[] {
		const { settings } = this.host;
		const link = buildDeeplink(this.app.vault.getName());
		return [
			{
				name: 'Price tier',
				desc: 'Which price the meal cards show.',
				control: {
					type: 'dropdown',
					key: 'priceRole',
					options: { student: 'Students', employee: 'Staff', guest: 'Guests' },
					defaultValue: 'student',
				},
			},
			{
				name: 'Shortcut link',
				desc: `Opens the menu from outside Obsidian, e.g. as a shortcut or home screen icon. Add &canteen=<name> to pick a canteen. ${link}`,
				action: () => {
					void navigator.clipboard.writeText(link).then(() => new Notice('Link copied'));
				},
			},
			{
				type: 'list',
				heading: 'Favorites',
				emptyState: 'No canteens yet. Add one from the menu in the sidebar view.',
				onReorder: (from, to) => this.change(() => reorderFavorite(settings, from, to)),
				onDelete: (index) => {
					const favorite = settings.favorites[index];
					if (favorite) this.change(() => removeFavorite(settings, favorite.id));
				},
				items: settings.favorites.map((favorite) => ({
					name: favorite.name,
					desc: favorite.city ? `${favorite.city} · ${favorite.sourceName}` : favorite.sourceName,
				})),
			},
		];
	}

	getControlValue(key: string): unknown {
		return key === 'priceRole' ? this.host.settings.priceRole : undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key !== 'priceRole') return;
		this.host.settings.priceRole = value as PriceRole;
		await this.host.saveSettings();
	}

	private change(mutate: () => void): void {
		mutate();
		// saveSettings() rebuilds this tab.
		void this.host.saveSettings();
	}
}
