const MASKED: readonly { pattern: RegExp; name: string }[] = [
	{ name: "/letters/read/[id]", pattern: /^\/letters\/read\/[^/]+\/?$/ },
];

export function screenName(pathname: string): string {
	return MASKED.find((m) => m.pattern.test(pathname))?.name ?? pathname;
}

export const OBSERVE_FILTERED_PARAMS: readonly string[] = ["q", "id"];
