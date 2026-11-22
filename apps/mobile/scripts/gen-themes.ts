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
