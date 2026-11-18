import {
	COUNTRY_RESOURCES,
	IASP_DIRECTORY_URL,
	type Resource,
} from "@xolace/backend/convex/lib/crisisResources";
import { describe, expect, it } from "vitest";
import { COPY } from "@/features/care/help/copy";
import {
	ELSEWHERE,
	GHANA,
	UNITED_STATES,
} from "@/features/care/help/dev/fixtures";
import {
	actionOf,
	choiceOf,
	countryOf,
	failureOf,
	HELP_OPTIONS,
	helpView,
	hostOf,
	lineOf,
} from "@/features/care/help/help-model";

const phone = (over: Partial<Resource> = {}): Resource => ({
	label: "Lifeline",
	priority: 1,
	source: "crisis_line",
	type: "phone",
	value: "116-123",
	...over,
});

describe("the country menu", () => {
	it("offers all ten countries by name, then somewhere else", () => {
		expect(HELP_OPTIONS).toHaveLength(11);
		const names = HELP_OPTIONS.slice(0, -1).map((o) => o.label);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		expect(HELP_OPTIONS.at(-1)).toEqual({
			id: "elsewhere",
			label: COPY.elsewhere,
		});
	});

	it("opens on the device's region when the list covers it", () => {
		expect(choiceOf("GH")).toBe("GH");
		expect(choiceOf("BR")).toBe("elsewhere");
		expect(choiceOf(undefined)).toBe("elsewhere");
	});

	it("names no country to analytics for elsewhere", () => {
		expect(countryOf(GHANA)).toBe("GH");
		expect(countryOf(ELSEWHERE)).toBeNull();
	});
});

describe("helpView", () => {
	it("leads with the country's emergency number and lists every line in order", () => {
		const view = helpView(GHANA);
		expect(view.emergency).toBe("112");
		expect(view.lines.map((l) => l.title)).toEqual(
			COUNTRY_RESOURCES.GH.resources.map((r) => r.label)
		);
	});

	it("gives a country the list doesn't cover IASP's directory and no number", () => {
		const view = helpView(ELSEWHERE);
		expect(view.emergency).toBeNull();
		expect(view.lines).toHaveLength(1);
		expect(view.lines[0]?.action?.url).toBe(IASP_DIRECTORY_URL);
	});

	it("keeps the US's pages and its SMS line", () => {
		const types = new Set(helpView(UNITED_STATES).lines.map((l) => l.type));
		expect(types.has("url")).toBe(true);
		expect(types.has("text")).toBe(true);
	});
});

describe("a line", () => {
	it("calls a phone line and shows its number, with the note under it", () => {
		const line = lineOf(phone({ description: "Free, any hour" }));
		expect(line.action).toEqual({
			kind: "call",
			label: COPY.actions.call,
			url: "tel:116-123",
		});
		expect(line.sub).toBe("116-123");
		expect(line.detail).toBe("Free, any hour");
	});

	it("is warm for a crisis line and neutral for a service", () => {
		expect(lineOf(phone()).tone).toBe("care");
		expect(lineOf(phone({ source: "local_service" })).tone).toBe("service");
		expect(lineOf(phone({ source: "online_resource" })).tone).toBe("service");
	});

	it("emails an address and opens a page", () => {
		expect(actionOf(phone({ type: "email", value: "a@b.org" }))?.url).toBe(
			"mailto:a@b.org"
		);
		const page = lineOf(
			phone({ type: "url", value: "https://www.example.org/help" })
		);
		expect(page.action?.kind).toBe("open");
		expect(page.sub).toBe("example.org");
	});

	it("has nothing to tap for an SMS keyword", () => {
		const line = lineOf(phone({ type: "text", value: "Text HOME to 741741" }));
		expect(line.action).toBeNull();
		expect(line.sub).toBe("Text HOME to 741741");
	});

	it("reads a host, or the whole string when it isn't a URL", () => {
		expect(hostOf("https://chat.988lifeline.org")).toBe("chat.988lifeline.org");
		expect(hostOf("not a url")).toBe("not a url");
	});
});

describe("failureOf", () => {
	it("keeps production's toasts", () => {
		expect(failureOf("call")).toEqual({
			cannot: COPY.toast.noPhone,
			failed: COPY.toast.noDialer,
		});
		expect(failureOf("email")).toEqual({
			cannot: COPY.toast.noMail,
			failed: COPY.toast.mailFailed,
		});
		expect(failureOf("open").failed).toBe(COPY.toast.linkFailed);
	});
});
