/**
 * Writes the theme files from the registry (src/design/themes.ts):
 *
 *   bun run themes
 *
 * - src/themes/themes.generated.css: one `@variant` per theme and mode.
 * - src/design/theme-names.generated.json: the theme names Metro registers.
 * - src/themes/type.generated.css: font role defaults, fixed faces and one
 *   `type-<variant>` utility per entry in TYPE (src/design/type.ts).
 * - src/design/type-classes.generated.ts: those class names as literals, so
 *   Tailwind finds them.
 *
 * All are committed so a diff shows what changed. Restart Metro after running
 * it (`extraThemes` is read at start).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderThemeNames, renderThemesCss } from "./themes/build";
import { renderTypeClasses, renderTypeCss } from "./themes/type";

const root = join(import.meta.dirname, "..");
writeFileSync(join(root, "src/themes/themes.generated.css"), renderThemesCss());
writeFileSync(
	join(root, "src/design/theme-names.generated.json"),
	renderThemeNames()
);
writeFileSync(join(root, "src/themes/type.generated.css"), renderTypeCss());
writeFileSync(
	join(root, "src/design/type-classes.generated.ts"),
	renderTypeClasses()
);
process.stdout.write(
	"gen-themes: wrote the theme CSS, names and type files.\n"
);
