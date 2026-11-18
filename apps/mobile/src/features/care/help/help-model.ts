/** Get help now, pure: which country, its emergency number, and each line as a row to draw. */
import {
	COUNTRY_RESOURCES,
	type CountryCode,
	IASP_DIRECTORY_URL,
	isCountryCode,
	type Resource,
} from "@xolace/backend/convex/lib/crisisResources";
import type { Choice } from "@/components/shared/choice-props";
import { COPY } from "@/features/care/help/copy";

/** A country the list has lines for, or "elsewhere": anywhere it doesn't. */
export type HelpChoice = CountryCode | "elsewhere";

/** What tapping a row does: dial, write, or open a page. */
export type LineKind = "call" | "email" | "open";

/** Crisis lines get the warm Call (danger wash); services and pages a neutral one. */
export type LineTone = "care" | "service";

export type LineView = {
	key: string;
	title: string;
	/** The number, address or text to send: always shown, so it can be dialled by hand. */
	sub: string;
	/** The list's own note, under the sub. */
	detail?: string;
	tone: LineTone;
	/** Null for a line there's nothing to tap on (an SMS keyword). */
	action: { kind: LineKind; url: string; label: string } | null;
	/** For analytics (`crisis_resource_tapped`). */
	source: Resource["source"] | "directory";
	type: Resource["type"];
};

export type HelpView = {
	/** Null where the list has no country: the screen says so instead. */
	emergency: string | null;
	lines: readonly LineView[];
};

/** The ten countries by name, then "Somewhere else". */
export const HELP_OPTIONS: readonly Choice<HelpChoice>[] = [
	...(Object.keys(COUNTRY_RESOURCES) as CountryCode[])
		.map((code) => ({ id: code, label: COUNTRY_RESOURCES[code].name }))
		.sort((a, b) => a.label.localeCompare(b.label)),
	{ id: "elsewhere", label: COPY.elsewhere },
];

/** The device's region, if the list has lines there; else "elsewhere". */
export const choiceOf = (region: string | null | undefined): HelpChoice =>
	isCountryCode(region) ? region : "elsewhere";

/** The country analytics names: null for "elsewhere". */
export const countryOf = (choice: HelpChoice): CountryCode | null =>
	choice === "elsewhere" ? null : choice;

const SERVICE_SOURCES: readonly Resource["source"][] = [
	"local_service",
	"online_resource",
];

/** How a resource opens, or null when it can't (a "text" line is instructions). */
export function actionOf(resource: Resource): LineView["action"] {
	switch (resource.type) {
		case "phone":
			return {
				kind: "call",
				label: COPY.actions.call,
				url: `tel:${resource.value}`,
			};
		case "email":
			return {
				kind: "email",
				label: COPY.actions.email,
				url: `mailto:${resource.value}`,
			};
		case "url":
			return { kind: "open", label: COPY.actions.open, url: resource.value };
		default:
			return null;
	}
}

const HOST = /^[a-z]+:\/\/(?:www\.)?([^/]+)/i;

/** A page's host, for its sub line: `https://www.iasp.info/x` → `iasp.info`. */
export function hostOf(url: string): string {
	return url.match(HOST)?.[1] ?? url;
}

export function lineOf(resource: Resource): LineView {
	const page = resource.type === "url";
	return {
		action: actionOf(resource),
		detail: page ? undefined : resource.description,
		key: `${resource.type}-${resource.value}`,
		source: resource.source,
		sub: page
			? (resource.description ?? hostOf(resource.value))
			: resource.value,
		title: resource.label,
		tone: SERVICE_SOURCES.includes(resource.source) ? "service" : "care",
		type: resource.type,
	};
}

/** The one line for "elsewhere": IASP's directory. */
const DIRECTORY_LINE: LineView = {
	action: { kind: "open", label: COPY.actions.open, url: IASP_DIRECTORY_URL },
	key: "directory",
	source: "directory",
	sub: COPY.directory.sub,
	title: COPY.directory.title,
	tone: "care",
	type: "url",
};

export function helpView(choice: HelpChoice): HelpView {
	if (choice === "elsewhere") {
		return { emergency: null, lines: [DIRECTORY_LINE] };
	}
	const country = COUNTRY_RESOURCES[choice];
	return {
		emergency: country.emergencyNumber,
		lines: country.resources.map(lineOf),
	};
}

/** The toasts when a row can't open (production's wording), by what it opens. */
export function failureOf(kind: LineKind): {
	cannot: string;
	failed: string;
} {
	switch (kind) {
		case "call":
			return { cannot: COPY.toast.noPhone, failed: COPY.toast.noDialer };
		case "email":
			return { cannot: COPY.toast.noMail, failed: COPY.toast.mailFailed };
		default:
			return { cannot: COPY.toast.linkFailed, failed: COPY.toast.linkFailed };
	}
}
