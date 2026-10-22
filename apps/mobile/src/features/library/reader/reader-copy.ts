/**
 * The reader's copy and body prep, kept pure so it can be tested without a
 * renderer. Reader-facing prose says "Lantern", never "library" (CONTEXT.md).
 */

import type { Infer } from 'convex/values';

import type { Doc } from '@/convex/_generated/dataModel';
import type { entrySource } from '@/convex/library/sources';

export type Kind = Doc<'library_entries'>['kind'];
type Reuse = Doc<'library_entries'>['reuse'];

const LEADING_H1 = /^#[ \t]+[^\n]*\n*/;
// ponytail: enriched-markdown 1.0.2 has no GFM admonitions (#386) — the
// marker would render as literal "[!TIP]". Delete this once we're on 1.1.0
// and style `blockquote.admonitions` instead.
const ALERT_MARKER = /^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/gim;

export const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1).toLowerCase();

/** Stored GFM → what the renderer is handed. */
export function prepareBody(markdown: string) {
  return markdown
    .replace(LEADING_H1, '')
    .replace(ALERT_MARKER, (_, type: string) => `> **${capitalise(type)}**\n>`);
}

type Source = Pick<Infer<typeof entrySource>, 'name' | 'url' | 'logoUrl' | 'pageUrl' | 'author' | 'attributionText'>;
type Credited = { reuse: Reuse; sources: Source[] };

const XOLACE = 'Xolace';
const XOLACE_ATTRIBUTION = '© Xolace';

/**
 * The header credit follows `reuse`, never the source count (CONTEXT.md
 * "Most entries are adapted from several sources"): only verbatim words
 * carry a publisher's name — an adapted entry is our wording.
 */
export function headerCredit({ reuse, sources }: Credited) {
  const s = sources[0];
  if (reuse === 'verbatim' && s) {
    return {
      name: s.name,
      logoUrl: s.logoUrl,
      line: ['Published as they wrote it', s.author && `by ${s.author}`].filter(Boolean).join(' · '),
      href: s.pageUrl ?? s.url,
      xolace: false,
    };
  }
  return { name: XOLACE, line: reuse === 'adapted' ? 'Adapted by Xolace' : 'Written for Lantern', xolace: true };
}

/** The licence lines after the body: each once, in source order. */
export const attributionLines = (sources: Source[]) =>
  sources.length ? [...new Set(sources.map((s) => s.attributionText))] : [XOLACE_ATTRIBUTION];

export function metaLine(kind: Kind, readMin: number, storyDescriptor?: string, listenMin?: number) {
  return [capitalise(kind), storyDescriptor, `${readMin} min read`, listenMin && `${listenMin} min listen`]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The meta line as a screen reader hears it (#400): kind · who it's from ·
 * the times. An adapted entry names no publisher. Commas, since "·" is read aloud.
 */
export function metaLabel(
  e: Credited & { kind: Kind; readMin: number; storyDescriptor?: string; listenMin?: number },
) {
  return [
    capitalise(e.kind),
    e.storyDescriptor,
    e.reuse === 'adapted' ? `adapted by ${XOLACE}` : `from ${headerCredit(e).name}`,
    `${e.readMin} min read`,
    e.listenMin && `${e.listenMin} min listen`,
  ]
    .filter(Boolean)
    .join(', ');
}

/** "Reflect on this" when the curator wrote no prompt of their own (#413). */
export const REFLECT_PROMPT = 'What did this bring up for you?';

/** What the share sheet sends: a short personal note, then the link. */
export const shareMessage = (title: string, url: string) =>
  `I just read “${title}” on Xolace and thought you might like it too. Worth a few minutes:\n${url}`;
