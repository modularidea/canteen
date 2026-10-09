import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { buildDeeplink } from './deeplink';
import { CanteenSettings, moveFavorite, removeFavorite } from './settings';
import { PriceRole } from './types';

interface SettingsHost extends Plugin {
	settings: CanteenSettings;
	saveSettings(): Promise<void>;
}

export class CanteenSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly host: SettingsHost) {
		super(app, host);
	}

	display(): void {
		const { containerEl } = this;
		const { settings } = this.host;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Price tier')
			.setDesc('Which price the meal cards show.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('student', 'Students')
					.addOption('employee', 'Staff')
					.addOption('guest', 'Guests')
					.setValue(settings.priceRole)
					.onChange(async (value) => {
						settings.priceRole = value as PriceRole;
						await this.host.saveSettings();
					}),
			);

		const link = buildDeeplink(this.app.vault.getName());
		new Setting(containerEl)
			.setName('Shortcut link')
			.setDesc(`Opens the menu from outside Obsidian, e.g. as a shortcut or home screen icon. Add &canteen=<name> to pick a canteen. ${link}`)
			.addButton((b) =>
				b.setButtonText('Copy link').onClick(async () => {
					await navigator.clipboard.writeText(link);
					new Notice('Link copied');
				}),
			);

		new Setting(containerEl).setName('Saved canteens').setHeading();
		if (settings.favorites.length === 0) {
			containerEl.createEl('p', { text: 'No canteens yet. Add one from the menu in the sidebar view.', cls: 'setting-item-description' });
		}
		for (const favorite of settings.favorites) {
			new Setting(containerEl)
				.setName(favorite.name)
				.setDesc(favorite.city ? `${favorite.city} · ${favorite.sourceName}` : favorite.sourceName)
				.addExtraButton((b) => b.setIcon('arrow-up').setTooltip('Move up').onClick(() => this.change(() => moveFavorite(settings, favorite.id, -1))))
				.addExtraButton((b) => b.setIcon('arrow-down').setTooltip('Move down').onClick(() => this.change(() => moveFavorite(settings, favorite.id, 1))))
				.addExtraButton((b) => b.setIcon('trash').setTooltip('Remove').onClick(() => this.change(() => removeFavorite(settings, favorite.id))));
		}
	}

	private change(mutate: () => void): void {
		mutate();
		void this.host.saveSettings().then(() => this.display());
	}
}
