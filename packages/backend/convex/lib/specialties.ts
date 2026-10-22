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
    slug: "anxiety",
    label: "Anxiety",
    pickerLabel: "Anxiety & overthinking",
    listensTo: "anxiety and overthinking",
  },
  {
    slug: "sleep",
    label: "Sleep",
    pickerLabel: "Sleep & exhaustion",
    listensTo: "sleepless nights and exhaustion",
  },
  {
    slug: "loneliness",
    label: "Loneliness",
    pickerLabel: "Loneliness",
    listensTo: "loneliness",
  },
  {
    slug: "grief",
    label: "Grief",
    pickerLabel: "Grief & loss",
    listensTo: "grief and loss",
  },
  {
    slug: "burnout",
    label: "Burnout",
    pickerLabel: "Burnout & work stress",
    listensTo: "burnout and work stress",
  },
  {
    slug: "relationships",
    label: "Relationships",
    pickerLabel: "Relationships",
    listensTo: "relationships",
  },
  { slug: "family", label: "Family", pickerLabel: "Family", listensTo: "family" },
  {
    slug: "identity",
    label: "Identity",
    pickerLabel: "Identity & belonging",
    listensTo: "identity and belonging",
  },
  {
    slug: "addiction",
    label: "Addiction",
    pickerLabel: "Addiction & recovery",
    listensTo: "addiction and staying sober",
  },
  {
    slug: "studies",
    label: "Studies",
    pickerLabel: "Studies & exams",
    listensTo: "studies and exams",
  },
  {
    slug: "change",
    label: "Big changes",
    pickerLabel: "Big life changes",
    listensTo: "big life changes",
  },
] as const;

export type Specialty = (typeof SPECIALTIES)[number]["slug"];

/** Hard cap. Past four, a profile stops saying anything specific at all. */
export const MAX_SPECIALTIES = 4;

export const specialtyValidator = v.union(
  ...SPECIALTIES.map((specialty) => v.literal(specialty.slug)),
);

/** Guards a slug arriving from a route param — anything else is ignored. */
export function isSpecialty(slug: string | undefined): slug is Specialty {
  return SPECIALTIES.some((specialty) => specialty.slug === slug);
}

export function specialtyLabel(slug: string): string {
  return SPECIALTIES.find((specialty) => specialty.slug === slug)?.label ?? slug;
}

/** Completes "<name> listens to ___." Falls back to the slug's own words. */
export function specialtyListensTo(slug: string): string {
  return (
    SPECIALTIES.find((specialty) => specialty.slug === slug)?.listensTo ?? slug
  );
}
