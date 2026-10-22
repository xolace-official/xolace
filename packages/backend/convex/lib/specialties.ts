import { v } from "convex/values";

/**
 * What a xolacer is here for — a fixed, self-declared taxonomy, never free
 * text. Free text would let a volunteer advertise "depression" or "trauma" on
 * a profile the app can't stand behind, and it makes the roster's filter chips
 * impossible.
 *
 * The list deliberately stops short of clinical territory: no depression, no
 * trauma. Advertising a peer volunteer as a specialist in those invites
 * exactly the conversations the escalation exclusion exists to keep out.
 * Addiction is in, phrased as recovery and sobriety — peer support is the one
 * place that tradition already lives — but it stays a listening declaration,
 * not treatment.
 *
 * `label` is the compact chip (roster rows, profile); `pickerLabel` is the
 * fuller phrasing used in the setup list, where there's room to be specific;
 * `listensTo` completes "<name> listens to ___." on the session-end
 * suggestion card — a statement about what the xolacer declared, never a
 * claim about the person reading it.
 * Shared by the Convex validator and the app so the picker, the chips and the
 * filter can never drift apart.
 */
export const SPECIALTIES = [
	{
		label: "Anxiety",
		listensTo: "anxiety and overthinking",
		pickerLabel: "Anxiety & overthinking",
		slug: "anxiety",
	},
	{
		label: "Sleep",
		listensTo: "sleepless nights and exhaustion",
		pickerLabel: "Sleep & exhaustion",
		slug: "sleep",
	},
	{
		label: "Loneliness",
		listensTo: "loneliness",
		pickerLabel: "Loneliness",
		slug: "loneliness",
	},
	{
		label: "Grief",
		listensTo: "grief and loss",
		pickerLabel: "Grief & loss",
		slug: "grief",
	},
	{
		label: "Burnout",
		listensTo: "burnout and work stress",
		pickerLabel: "Burnout & work stress",
		slug: "burnout",
	},
	{
		label: "Relationships",
		listensTo: "relationships",
		pickerLabel: "Relationships",
		slug: "relationships",
	},
	{
		label: "Family",
		listensTo: "family",
		pickerLabel: "Family",
		slug: "family",
	},
	{
		label: "Identity",
		listensTo: "identity and belonging",
		pickerLabel: "Identity & belonging",
		slug: "identity",
	},
	{
		label: "Addiction",
		listensTo: "addiction and staying sober",
		pickerLabel: "Addiction & recovery",
		slug: "addiction",
	},
	{
		label: "Studies",
		listensTo: "studies and exams",
		pickerLabel: "Studies & exams",
		slug: "studies",
	},
	{
		label: "Big changes",
		listensTo: "big life changes",
		pickerLabel: "Big life changes",
		slug: "change",
	},
] as const;

export type Specialty = (typeof SPECIALTIES)[number]["slug"];

/** Hard cap. Past four, a profile stops saying anything specific at all. */
export const MAX_SPECIALTIES = 4;

export const specialtyValidator = v.union(
	...SPECIALTIES.map((specialty) => v.literal(specialty.slug))
);

/** Guards a slug arriving from a route param — anything else is ignored. */
export function isSpecialty(slug: string | undefined): slug is Specialty {
	return SPECIALTIES.some((specialty) => specialty.slug === slug);
}

export function specialtyLabel(slug: string): string {
	return (
		SPECIALTIES.find((specialty) => specialty.slug === slug)?.label ?? slug
	);
}

/** Completes "<name> listens to ___." Falls back to the slug's own words. */
export function specialtyListensTo(slug: string): string {
	return (
		SPECIALTIES.find((specialty) => specialty.slug === slug)?.listensTo ?? slug
	);
}
