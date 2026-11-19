/**
 * The bundled stills, by catalogue key (`packages/backend/scripts/quote-backgrounds`, B18): the
 * owner's art as a 1080 × 1920 WebP each, made by `quote-backgrounds:process`. Poster and Night
 * are drawn in code. A key the catalogue lists that isn't here (a newer catalogue than this
 * build) is left off the sheet.
 *
 * A new still gets its line here and its row in the manifest only once its file exists:
 * `require` of a missing file breaks the bundle.
 */
export const STILLS: Readonly<Record<string, number>> = {
	"deep-forest": require("@/assets/quotes/stills/deep-forest.webp"),
	dunes: require("@/assets/quotes/stills/dunes.webp"),
	"first-light": require("@/assets/quotes/stills/first-light.webp"),
	"ink-wash": require("@/assets/quotes/stills/ink-wash.webp"),
	moonrise: require("@/assets/quotes/stills/moonrise.webp"),
	"mountain-air": require("@/assets/quotes/stills/mountain-air.webp"),
	nebula: require("@/assets/quotes/stills/nebula.webp"),
	"night-earth": require("@/assets/quotes/stills/night-earth.webp"),
	"reading-nook": require("@/assets/quotes/stills/reading-nook.webp"),
	rooftops: require("@/assets/quotes/stills/rooftops.webp"),
	shallows: require("@/assets/quotes/stills/shallows.webp"),
	silk: require("@/assets/quotes/stills/silk.webp"),
	snowfield: require("@/assets/quotes/stills/snowfield.webp"),
	"still-water": require("@/assets/quotes/stills/still-water.webp"),
	watercolour: require("@/assets/quotes/stills/watercolour.webp"),
	wildflowers: require("@/assets/quotes/stills/wildflowers.webp"),
};
