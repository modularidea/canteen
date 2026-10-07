import { MealNote } from '../../types';

// Code legend as published on seezeit.com (labels stay German: they are the
// operator's own wording and must match the notice at the canteen).
const LEGEND: Record<string, { label: string; kind: 'allergen' | 'additive' }> = {
	'1': { label: 'mit Farbstoffen', kind: 'additive' },
	'2': { label: 'mit Konservierungsstoffen', kind: 'additive' },
	'3': { label: 'mit Antioxidationsmittel', kind: 'additive' },
	'4': { label: 'mit Geschmacksverstärker', kind: 'additive' },
	'5': { label: 'geschwefelt', kind: 'additive' },
	'6': { label: 'geschwärzt', kind: 'additive' },
	'7': { label: 'gewachst', kind: 'additive' },
	'8': { label: 'mit Phosphat', kind: 'additive' },
	'9': { label: 'mit Süßungsmitteln', kind: 'additive' },
	'10': { label: 'enthält eine Phenylalaninquelle', kind: 'additive' },
	'11': { label: 'genetisch verändert', kind: 'additive' },
	'12': { label: 'enthält Sojaöl, aus genetisch verändertem Soja hergestellt', kind: 'additive' },
	'25a': { label: 'Weizen', kind: 'allergen' },
	'25b': { label: 'Roggen (Weizen)', kind: 'allergen' },
	'25c': { label: 'Gerste (Weizen)', kind: 'allergen' },
	'25d': { label: 'Dinkel (Weizen)', kind: 'allergen' },
	'25e': { label: 'Hafer (Weizen)', kind: 'allergen' },
	'25f': { label: 'Kamut (Weizen)', kind: 'allergen' },
	'26': { label: 'Fisch', kind: 'allergen' },
	'27': { label: 'Krebstiere (Krusten- und Schalentiere)', kind: 'allergen' },
	'28': { label: 'Ei', kind: 'allergen' },
	'29': { label: 'Erdnüsse', kind: 'allergen' },
	'30': { label: 'Soja', kind: 'allergen' },
	'31': { label: 'Milch & Laktose', kind: 'allergen' },
	'32a': { label: 'Mandeln', kind: 'allergen' },
	'32b': { label: 'Queenslandnüsse', kind: 'allergen' },
	'32c': { label: 'Haselnüsse', kind: 'allergen' },
	'32d': { label: 'Pecannüsse', kind: 'allergen' },
	'32e': { label: 'Paranüsse', kind: 'allergen' },
	'32f': { label: 'Macadamianüsse', kind: 'allergen' },
	'32g': { label: 'Kaschunüsse', kind: 'allergen' },
	'32h': { label: 'Walnüsse', kind: 'allergen' },
	'32i': { label: 'Pistazien', kind: 'allergen' },
	'33': { label: 'Sellerie', kind: 'allergen' },
	'34': { label: 'Senf', kind: 'allergen' },
	'35': { label: 'Sesam', kind: 'allergen' },
	'36': { label: 'Schwefeldioxid bzw. Sulfite ab 10 mg pro kg/ltr', kind: 'allergen' },
	'37': { label: 'Lupine', kind: 'allergen' },
	'38': { label: 'Weichtiere', kind: 'allergen' },
};

export function describeCode(code: string): MealNote {
	const entry = LEGEND[code];
	return entry ? { code, label: entry.label, kind: entry.kind } : { code, label: code, kind: 'unknown' };
}
