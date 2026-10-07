# Canteen Menu

Shows the current menu of your canteen in the sidebar: dishes by category, the price for your price tier, vegan/vegetarian badges and allergen information. Works on desktop and mobile.

## Supported canteens

- **Seezeit Studierendenwerk Bodensee**: HTWG Konstanz, Gießberg (University of Konstanz), Fallenbrunnen (Friedrichshafen), Weingarten, Ravensburg.

More student services are planned.

## Usage

1. Open the menu with the ribbon icon or the command **Open menu**.
2. Choose **More options → Add canteen**. Search by name (for example "HTWG") or paste the URL of the canteen's menu page.
3. Pick the day with the day bar. Today is selected automatically; on weekends the next day with a menu is shown.

In the plugin settings you can choose which price is shown (**Students**, **Staff** or **Guests**; default: Students) and reorder or remove saved canteens.

## How data is loaded

- The menu is loaded **directly from the canteen operator's published menu data to your device**. There is no server in between and nothing is uploaded.
- The menu is downloaded once per week (the operator's file covers about two weeks) and kept in the plugin's local data file. The refresh button forces a download. If a download fails, the last saved menu is shown with its age.
- The data is shown for **personal use only** and always with its source. Menu photos are not displayed.

## Allergen information

Allergen and additive codes are shown as the operator publishes them. **No guarantee**: the notice at the canteen applies.

## Development

```bash
npm install
npm run dev     # esbuild watch
npm run build   # typecheck + production bundle
npm test        # unit tests
```

Link the plugin folder into a test vault as `.obsidian/plugins/canteen-menu`.

## License

0BSD
