import {
	COUNTRY_RESOURCES,
	type CountryCode,
	IASP_DIRECTORY_URL,
	isCountryCode,
	type Resource,
} from "@xolace/backend/convex/lib/crisisResources";
import type { Choice } from "@/components/shared/choice-props";
import { COPY } from "@/features/care/help/copy";

export type HelpChoice = CountryCode | "elsewhere";

export type LineKind = "call" | "email" | "open";

export type LineTone = "care" | "service";

export type LineView = {
	key: string;
	title: string;
	sub: string;
	detail?: string;
	tone: LineTone;
	action: { kind: LineKind; url: string; label: string } | null;
	source: Resource["source"] | "directory";
	type: Resource["type"];
};

export type HelpView = {
	emergency: string | null;
	lines: readonly LineView[];
};

export const HELP_OPTIONS: readonly Choice<HelpChoice>[] = [
	...(Object.keys(COUNTRY_RESOURCES) as CountryCode[])
		.map((code) => ({ id: code, label: COUNTRY_RESOURCES[code].name }))
		.sort((a, b) => a.label.localeCompare(b.label)),
	{ id: "elsewhere", label: COPY.elsewhere },
];

export const choiceOf = (region: string | null | undefined): HelpChoice =>
	isCountryCode(region) ? region : "elsewhere";

export const countryOf = (choice: HelpChoice): CountryCode | null =>
	choice === "elsewhere" ? null : choice;

const SERVICE_SOURCES: readonly Resource["source"][] = [
	"local_service",
	"online_resource",
];

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

export function failureOf(kind: LineKind): string {
	switch (kind) {
		case "call":
			return COPY.toast.noDialer;
		case "email":
			return COPY.toast.noMail;
		default:
			return COPY.toast.linkFailed;
	}
}
