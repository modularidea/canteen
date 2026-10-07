import { ItemView, Menu, WorkspaceLeaf, setIcon } from 'obsidian';
import { LoadResult, MenuService } from '../service/menu-service';
import { CanteenSettings } from '../settings';
import { CanteenRef, Meal, ProviderError } from '../types';
import { renderDayBar } from '../ui/day-bar';
import { renderMealCard } from '../ui/meal-card';
import { errorMessage, renderState } from '../ui/state-message';
import { pickDefaultDay, todayKey } from './day-select';

export const CANTEEN_VIEW_TYPE = 'canteen-menu-view';

/** What the view needs from the plugin; keeps the view free of a circular import on main.ts. */
export interface ViewHost {
	readonly settings: CanteenSettings;
	readonly service: MenuService;
	saveSettings(): Promise<void>;
}

const MIN_SPIN_MS = 500;
const MIDNIGHT_GRACE_MS = 2000;

export class CanteenMenuView extends ItemView {
	private result?: LoadResult;
	private error?: ProviderError;
	private loading = false;
	private selectedDate?: string;
	private userPickedDay = false;
	private loadToken = 0;
	private midnightTimer?: number;

	constructor(leaf: WorkspaceLeaf, private readonly host: ViewHost) {
		super(leaf);
	}

	getViewType(): string {
		return CANTEEN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Canteen menu';
	}

	getIcon(): string {
		return 'utensils';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('canteen-menu-view');
		// The service decides via the cache rule whether this really hits the network.
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf?.view === this) void this.loadCanteen();
			}),
		);
		this.scheduleMidnight();
		await this.loadCanteen();
	}

	async onClose(): Promise<void> {
		if (this.midnightTimer !== undefined) window.clearTimeout(this.midnightTimer);
	}

	/** Re-render with current settings (price tier, favorites) without refetching. */
	refresh(): void {
		this.render();
	}

	private get canteen(): CanteenRef | undefined {
		const { favorites, selectedId } = this.host.settings;
		return favorites.find((f) => f.id === selectedId) ?? favorites[0];
	}

	private scheduleMidnight(): void {
		const now = new Date();
		const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
		this.midnightTimer = window.setTimeout(() => {
			this.userPickedDay = false;
			void this.loadCanteen();
			this.scheduleMidnight();
		}, next - now.getTime() + MIDNIGHT_GRACE_MS);
	}

	async loadCanteen(force = false): Promise<void> {
		const canteen = this.canteen;
		if (!canteen) {
			this.result = undefined;
			this.error = undefined;
			this.render();
			return;
		}
		const token = ++this.loadToken;
		this.loading = true;
		this.render();
		try {
			const [result] = await Promise.all([
				this.host.service.load(canteen, { force }),
				force ? new Promise((resolve) => window.setTimeout(resolve, MIN_SPIN_MS)) : Promise.resolve(),
			]);
			if (token !== this.loadToken) return;
			this.result = result;
			this.error = result.error;
		} catch (e) {
			if (token !== this.loadToken) return;
			this.result = undefined;
			this.error = e instanceof ProviderError ? e : new ProviderError('network', (e as Error).message);
		}
		this.loading = false;
		this.ensureDay();
		this.render();
	}

	private ensureDay(): void {
		const days = this.result?.days ?? [];
		const stillThere = this.selectedDate !== undefined && days.some((d) => d.date === this.selectedDate);
		if (!this.userPickedDay || !stillThere) this.selectedDate = pickDefaultDay(days, todayKey(new Date()));
	}

	private selectCanteen(id: string): void {
		this.host.settings.selectedId = id;
		this.result = undefined;
		this.error = undefined;
		this.selectedDate = undefined;
		this.userPickedDay = false;
		void this.host.saveSettings();
		void this.loadCanteen();
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		const canteen = this.canteen;

		this.renderHeader(root, canteen);
		if (!canteen) {
			renderState(root, 'no-canteen');
			return;
		}
		if (!this.result) {
			if (this.loading) renderState(root, 'loading');
			else if (this.error) renderState(root, 'error', { message: errorMessage(this.error), sourceUrl: canteen.sourceUrl });
			return this.renderFooter(root, canteen);
		}

		if (this.result.stale) {
			renderState(root, 'stale', { fetchedAt: this.result.fetchedAt, message: this.error ? errorMessage(this.error) : undefined });
		}
		const { days } = this.result;
		if (days.length === 0 || this.selectedDate === undefined) {
			renderState(root, 'empty', { message: 'No menu published for this canteen right now.' });
		} else {
			const selected = this.selectedDate;
			renderDayBar(root, days, selected, todayKey(new Date()), (date) => {
				this.selectedDate = date;
				this.userPickedDay = true;
				this.render();
			});
			const meals = days.find((d) => d.date === selected)?.meals ?? [];
			if (meals.length === 0) renderState(root, 'empty');
			else this.renderMeals(root, meals);
		}
		this.renderFooter(root, canteen);
	}

	private renderHeader(root: HTMLElement, canteen: CanteenRef | undefined): void {
		const header = root.createDiv({ cls: 'canteen-header' });
		const { favorites } = this.host.settings;
		if (favorites.length > 0) {
			const select = header.createEl('select', { cls: 'dropdown canteen-select' });
			for (const f of favorites) {
				const option = select.createEl('option', { text: f.city ? `${f.name} · ${f.city}` : f.name, value: f.id });
				if (f.id === canteen?.id) option.selected = true;
			}
			select.addEventListener('change', () => this.selectCanteen(select.value));
		} else {
			header.createDiv({ cls: 'canteen-select-placeholder', text: 'Canteen menu' });
		}

		const refresh = header.createEl('button', { cls: 'clickable-icon canteen-refresh', attr: { 'aria-label': 'Refresh' } });
		setIcon(refresh, 'refresh-cw');
		if (this.loading) refresh.addClass('is-spinning');
		refresh.disabled = !canteen;
		refresh.addEventListener('click', () => void this.loadCanteen(true));

		const more = header.createEl('button', { cls: 'clickable-icon canteen-more', attr: { 'aria-label': 'More options' } });
		setIcon(more, 'more-vertical');
		more.addEventListener('click', (evt) => {
			const menu = new Menu();
			if (canteen) {
				menu.addItem((item) =>
					item
						.setTitle('Open official page')
						.setIcon('external-link')
						.onClick(() => window.open(canteen.sourceUrl)),
				);
			}
			menu.showAtMouseEvent(evt);
		});
	}

	private renderMeals(root: HTMLElement, meals: Meal[]): void {
		const list = root.createDiv({ cls: 'canteen-meals' });
		const groups = new Map<string, Meal[]>();
		for (const meal of meals) {
			const group = groups.get(meal.category) ?? [];
			group.push(meal);
			groups.set(meal.category, group);
		}
		for (const [category, group] of groups) {
			const section = list.createDiv({ cls: 'canteen-category' });
			if (category) section.createDiv({ cls: 'canteen-category-title', text: category });
			for (const meal of group) renderMealCard(section, meal, this.host.settings.priceRole);
		}
	}

	private renderFooter(root: HTMLElement, canteen: CanteenRef): void {
		const footer = root.createDiv({ cls: 'canteen-footer' });
		const source = footer.createDiv();
		source.createSpan({ text: 'Data: ' });
		source.createEl('a', { text: canteen.sourceName, href: canteen.sourceUrl, cls: 'external-link' });
		footer.createDiv({ text: 'Allergen information without guarantee. The notice at the canteen applies.' });
	}
}
