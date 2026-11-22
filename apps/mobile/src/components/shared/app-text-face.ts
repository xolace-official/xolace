import type { TextStyle } from "react-native";
import { FONT_PAIRS, type FontRole } from "@/design/font-pairs";
import { TYPE, type TypeVariant, type Weight } from "@/design/type";

export const TEXT_COLORS = {
	accent: "text-accent",
	accentForeground: "text-accent-foreground",
	accentInk: "text-accent-ink",
	background: "text-background",
	dangerInk: "text-danger-ink",
	emberInk: "text-ember-ink",
	foreground: "text-foreground",
	muted: "text-muted",
	nightInk: "text-night-ink",
	nightInk2: "text-night-ink-2",
	nightInk3: "text-night-ink-3",
	subtle: "text-subtle",
	successInk: "text-success-ink",
} as const;
export type TextColor = keyof typeof TEXT_COLORS;

export const ROLE_CLASS: Record<FontRole, string> = {
	bold: "font-bold",
	display: "font-display",
	"display-bold": "font-display-bold",
	"display-semi": "font-display-semi",
	italic: "font-italic",
	"italic-medium": "font-italic-medium",
	medium: "font-medium",
	normal: "font-normal",
	semibold: "font-semibold",
};

const ROLE_OF_FACE: Readonly<Record<string, FontRole>> = Object.fromEntries(
	(Object.entries(FONT_PAIRS.warm) as [FontRole, string][]).map(
		([role, face]) => [face, role]
	)
);

const DISPLAY_ROLES: readonly string[] = [
	"display",
	"display-bold",
	"display-semi",
];
const ITALIC_ROLES: readonly string[] = ["italic", "italic-medium"];

const BOLD = 700;
const SEMIBOLD = 600;
const MEDIUM = 500;
const REGULAR = 400;

function weightOf(w: TextStyle["fontWeight"]): Weight {
	let n = REGULAR;
	if (w === "bold") {
		n = BOLD;
	} else if (w !== "normal" && w != null) {
		n = Number(w) || REGULAR;
	}
	if (n >= BOLD) {
		return "bold";
	}
	if (n >= SEMIBOLD) {
		return "semibold";
	}
	return n >= MEDIUM ? "medium" : "regular";
}

const WEIGHT_ROLE: Record<Weight, FontRole> = {
	bold: "bold",
	medium: "medium",
	regular: "normal",
	semibold: "semibold",
};

export function bodyRole(
	weight: Weight | undefined,
	italic: boolean
): FontRole {
	if (italic) {
		return weight && weight !== "regular" ? "italic-medium" : "italic";
	}
	return weight ? WEIGHT_ROLE[weight] : "normal";
}

export type Face = {
	roleClass?: string;
	style?: TextStyle;
	capped?: boolean;
};

export function resolveFace(
	variant: TypeVariant,
	weight: Weight | undefined,
	italicProp: boolean,
	flat: TextStyle | undefined
): Face {
	const { fontFamily, fontWeight, fontStyle, ...rest } = flat ?? {};
	const touched =
		fontFamily !== undefined ||
		fontWeight !== undefined ||
		fontStyle !== undefined;
	const cleaned = touched ? rest : undefined;

	const callerRole = fontFamily ? ROLE_OF_FACE[fontFamily] : undefined;
	if (fontFamily && !callerRole) {
		return { style: { ...rest, fontFamily } };
	}

	const variantRole: string = TYPE[variant].font;
	const role = callerRole ?? variantRole;
	if (DISPLAY_ROLES.includes(role)) {
		return {
			capped: true,
			roleClass: callerRole ? ROLE_CLASS[callerRole] : undefined,
			style: cleaned,
		};
	}
	if (!(role in ROLE_CLASS)) {
		return { style: cleaned };
	}

	const w =
		weight ?? (fontWeight === undefined ? undefined : weightOf(fontWeight));
	const italic =
		italicProp || fontStyle === "italic" || ITALIC_ROLES.includes(role);
	let out: FontRole | undefined;
	if (italic) {
		out = bodyRole(role === "italic-medium" ? "medium" : w, true);
	} else if (w) {
		out = WEIGHT_ROLE[w];
	} else if (callerRole) {
		out = callerRole;
	}
	return {
		roleClass: out && out !== variantRole ? ROLE_CLASS[out] : undefined,
		style: cleaned,
	};
}
