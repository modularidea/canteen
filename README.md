# Canteen

Shows today's menu of your canteen (mensa) in the Obsidian sidebar: dishes by category, the price for your price tier, vegan/vegetarian badges and allergen information. Works on desktop and mobile.

> **Unofficial.** This plugin is an independent project. It is not affiliated with, endorsed by or sponsored by any canteen operator, student services organisation or OpenMensa. See [Disclaimer](#disclaimer).

## Supported canteens

- **Seezeit Studierendenwerk Bodensee**: HTWG Konstanz, Gießberg (University of Konstanz), Fallenbrunnen (Friedrichshafen), Weingarten, Ravensburg.
- **Studierendenwerk Erlangen-Nürnberg**: Mensa Süd and Langemarckplatz (Erlangen), Insel Schütt and Regensburger Straße (Nürnberg), Ansbach, Eichstätt, Ingolstadt. Other locations of this operator work by pasting the feed URL (`…/daten-extern/sw-erlangen-nuernberg/xml/<location>.xml`). Allergen codes are shown as the operator publishes them, without translation.
- **[OpenMensa](https://openmensa.org)**: community directory with canteens all over Germany. Search finds them by name, city or address and hides canteens that currently publish no menu data. You can also paste an `openmensa.org/c/<id>` URL. Notes (allergens, additives) are free text from the respective parser and are shown unchanged.

More sources may follow.

## Usage

1. Open the menu with the ribbon icon or the command **Open menu**.
2. Choose **More options → Add canteen**. Search by name (for example "HTWG") or paste the URL of the canteen's menu page.
3. Pick the day with the day bar. Today is selected automatically; on weekends the next day with a menu is shown.

In the plugin settings you can choose which price is shown (**Students**, **Staff** or **Guests**; default: Students) and reorder or remove saved canteens.

### Shortcut link

`obsidian://canteen?vault=<vault name>` opens the menu; add `&canteen=<name or id>` (e.g. `&canteen=Mensa%20S%C3%BCd`) to switch to a saved canteen. Use it as a macOS/iOS/Android shortcut. The settings tab shows the link for your vault with a copy button.

## Network use and privacy

The plugin only talks to the data sources of the canteens you add, and only to load a menu:

| Source | Host |
| --- | --- |
| Seezeit | `www.max-manager.de`, `seezeit.com` (link only) |
| Studierendenwerk Erlangen-Nürnberg | `www.max-manager.de` |
| OpenMensa | `openmensa.org` |

- The menu is loaded **directly from the published menu data to your device**. There is no server of mine in between, and nothing is uploaded, tracked or sent anywhere else.
- OpenMensa search loads the public canteen list once per session and checks the best matches for upcoming menu data.
- Menus are downloaded about once per week and kept in the plugin's local data file. The refresh button forces a download. If a download fails, the last saved menu is shown with its age.
- Menu data is shown for **personal use only** and always with its source. Menu photos are not displayed.

## Disclaimer

**This plugin is provided "as is", without warranty of any kind, and the author accepts no liability or responsibility for it** (see [LICENSE](LICENSE)). In particular:

- **No affiliation.** The author has no relationship with the canteen operators or OpenMensa. All names, trademarks and menu data belong to their respective owners.
- **No responsibility towards operators.** The author is not responsible for how the data sources are used through this plugin, for changes to or the unavailability of their services, or for any claims between you and an operator or data provider. You are responsible for complying with the terms of use of the sources you access.
- **No guarantee of correctness.** Menus, prices, availability and especially **allergen and additive information** may be wrong, incomplete, outdated or mistranslated. **Never rely on this plugin for allergies, intolerances or other health-related decisions.** Always check the notice at the canteen.
- **Liability.** To the extent permitted by law, the author is not liable for any damage resulting from the use of this plugin or of the data it displays.

## Development

```bash
npm install
npm run dev     # esbuild watch
npm run build   # typecheck + production bundle
npm test        # unit tests
```

Link the plugin folder into a test vault as `.obsidian/plugins/canteen`.

## License

[0BSD](LICENSE)
