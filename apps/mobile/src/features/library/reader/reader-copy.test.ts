import { describe, expect, it } from 'vitest';

import { attributionLines, headerCredit, metaLabel, prepareBody } from './reader-copy';

describe('prepareBody', () => {
  it('drops a leading h1 — the cover already carries the title', () => {
    expect(prepareBody('# What burnout is\n\nBody text.')).toBe('Body text.');
  });

  it('keeps an h1 that is not the first line', () => {
    expect(prepareBody('Intro.\n\n# Later')).toBe('Intro.\n\n# Later');
  });

  it('turns a GFM alert marker into a bold label on its own line inside the quote', () => {
    expect(prepareBody('> [!TIP]\n> Write it down.')).toBe('> **Tip**\n>\n> Write it down.');
    expect(prepareBody('>[!caution]\n> Careful.')).toBe('> **Caution**\n>\n> Careful.');
  });

  it('leaves ordinary blockquotes alone', () => {
    expect(prepareBody('> Just a quote.')).toBe('> Just a quote.');
  });
});

const src = (name: string, extra: Partial<{ logoUrl: string; pageUrl: string; author: string; attributionText: string }> = {}) => ({
  name,
  url: `https://${name}.test`,
  pageTitle: `${name} page`,
  attributionText: `${name} licence`,
  ...extra,
});

describe('headerCredit', () => {
  it('verbatim credits its one publisher, linked to the page', () => {
    const nhs = src('NHS', { logoUrl: 'logo', pageUrl: 'https://NHS.test/p', author: 'Jo' });
    expect(headerCredit({ reuse: 'verbatim', sources: [nhs] })).toEqual({
      name: 'NHS',
      logoUrl: 'logo',
      line: 'Published as they wrote it · by Jo',
      href: 'https://NHS.test/p',
      xolace: false,
    });
  });

  it('adapted credits Xolace, never a publisher, however many sources', () => {
    const one = headerCredit({ reuse: 'adapted', sources: [src('NHS', { logoUrl: 'logo' })] });
    expect(one).toEqual({ name: 'Xolace', line: 'Adapted by Xolace', xolace: true });
    expect(headerCredit({ reuse: 'adapted', sources: [src('NHS'), src('Mind')] })).toEqual(one);
  });

  it('original is written for Lantern', () => {
    expect(headerCredit({ reuse: 'original', sources: [] })).toEqual({
      name: 'Xolace',
      line: 'Written for Lantern',
      xolace: true,
    });
  });
});

describe('attributionLines', () => {
  it('gives each licence line once, in source order', () => {
    expect(attributionLines([src('NHS'), src('Mind'), src('NHS')])).toEqual(['NHS licence', 'Mind licence']);
  });

  it("falls back to Xolace's own line when there are no sources", () => {
    expect(attributionLines([])).toEqual(['© Xolace']);
  });
});

describe('metaLabel', () => {
  const base = { kind: 'advice' as const, readMin: 4 };
  it('names the publisher only for verbatim', () => {
    expect(metaLabel({ ...base, reuse: 'verbatim', sources: [src('NHS')] })).toBe('Advice, from NHS, 4 min read');
    expect(metaLabel({ ...base, reuse: 'adapted', sources: [src('NHS')] })).toBe('Advice, adapted by Xolace, 4 min read');
    expect(metaLabel({ ...base, reuse: 'original', sources: [] })).toBe('Advice, from Xolace, 4 min read');
  });
});
