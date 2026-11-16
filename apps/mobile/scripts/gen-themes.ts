/**
 * Writes the theme files from the registry (src/design/themes.ts):
 *
 *   bun run themes
 *
 * - src/themes/themes.generated.css: one `@variant` per theme and mode.
 * - src/design/theme-names.generated.json: the theme names Metro registers.
 *
 * Both are committed so a diff shows what changed. Restart Metro after running
 * it (`extraThemes` is read at start).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderThemeNames, renderThemesCss } from "./themes/build";

const root = join(import.meta.dirname, "..");
writeFileSync(join(root, "src/themes/themes.generated.css"), renderThemesCss());
writeFileSync(
	join(root, "src/design/theme-names.generated.json"),
	renderThemeNames()
);
process.stdout.write("gen-themes: wrote the theme CSS and names.\n");
