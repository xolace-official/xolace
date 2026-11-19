/**
 * The bundled stills, by catalogue key (`packages/backend/scripts/quote-backgrounds`, B18): a
 * 1080 × 1920 WebP each, made by `quote-backgrounds:process`. Poster and Night are drawn in code.
 * A key the catalogue lists that isn't here (a newer catalogue than this build) is left off the
 * sheet.
 */
export const STILLS: Readonly<Record<string, number>> = {
	"deep-forest": require("@/assets/quotes/stills/deep-forest.webp"),
	dunes: require("@/assets/quotes/stills/dunes.webp"),
	"dusk-clouds": require("@/assets/quotes/stills/dusk-clouds.webp"),
	"first-light": require("@/assets/quotes/stills/first-light.webp"),
	moonrise: require("@/assets/quotes/stills/moonrise.webp"),
	"mountain-air": require("@/assets/quotes/stills/mountain-air.webp"),
	shallows: require("@/assets/quotes/stills/shallows.webp"),
	snowfield: require("@/assets/quotes/stills/snowfield.webp"),
	"still-water": require("@/assets/quotes/stills/still-water.webp"),
	wildflowers: require("@/assets/quotes/stills/wildflowers.webp"),
};
