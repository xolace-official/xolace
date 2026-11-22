import { describe, expect, it } from "vitest";
import {
	COUNTRY_RESOURCES,
	crisisContactsFor,
	type Resource,
} from "./crisisResources";

const VALID_TYPES = new Set<Resource["type"]>([
	"phone",
	"url",
	"text",
	"email",
]);
const VALID_SOURCES = new Set<Resource["source"]>([
	"crisis_line",
	"xolace_support",
	"text_support",
	"local_service",
	"online_resource",
]);

const countries = Object.values(COUNTRY_RESOURCES);
const resources = countries.flatMap((c) => c.resources);

describe("country resolution", () => {
	it("all countries have emergencyNumber", () => {
		for (const c of countries) {
			expect(c.emergencyNumber).toBeTruthy();
		}
	});

	it("emergencyNumber not duplicated in resources[]", () => {
		for (const c of countries) {
			const hasEmergency = c.resources.some(
				(r) => r.value === c.emergencyNumber && r.type === "phone"
			);
			expect(hasEmergency).toBe(false);
		}
	});

	it("resources are pre-sorted (priority ascending)", () => {
		for (const c of countries) {
			for (const [i, r] of c.resources.entries()) {
				if (i > 0) {
					expect(r.priority).toBeGreaterThanOrEqual(
						c.resources[i - 1].priority
					);
				}
			}
		}
	});
});

describe("data completeness", () => {
	it("every country has a non-empty name and flag", () => {
		for (const c of countries) {
			expect(c.name.length).toBeGreaterThan(0);
			expect(c.flag.length).toBeGreaterThan(0);
		}
	});

	it("every country has at least one resource", () => {
		for (const c of countries) {
			expect(c.resources.length).toBeGreaterThan(0);
		}
	});
});

describe("resource shape validation", () => {
	it("all resources have valid type and source values", () => {
		for (const r of resources) {
			expect(VALID_TYPES.has(r.type)).toBe(true);
			expect(VALID_SOURCES.has(r.source)).toBe(true);
		}
	});

	it("all resources have positive integer priority", () => {
		for (const r of resources) {
			expect(Number.isInteger(r.priority)).toBe(true);
			expect(r.priority).toBeGreaterThan(0);
		}
	});

	it("all resources have non-empty label and value", () => {
		for (const r of resources) {
			expect(r.label.length).toBeGreaterThan(0);
			expect(r.value.trim().length).toBeGreaterThan(0);
		}
	});

	it("url resources have values that start with http:// or https://", () => {
		for (const r of resources.filter((x) => x.type === "url")) {
			expect(r.value).toMatch(/^https?:\/\//);
		}
	});
});

describe("crisisContactsFor", () => {
	it("gives a known country's emergency number and priority-1 helplines", () => {
		const ghana = crisisContactsFor("GH");
		expect(ghana?.emergencyNumber).toBe("112");
		expect(ghana?.helplines.map((r) => r.value)).toEqual([
			"233-244-846-701",
			"233-2-444-71279",
		]);
	});

	it("returns null for a country with no list, so callers fall back to IASP", () => {
		expect(crisisContactsFor("JP")).toBeNull();
	});

	it("returns null for a missing country", () => {
		expect(crisisContactsFor(undefined)).toBeNull();
	});
});
