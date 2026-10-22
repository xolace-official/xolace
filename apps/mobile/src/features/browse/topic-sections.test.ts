import { describe, expect, it } from 'vitest';
import { topicRows } from './topic-sections';

const t = (id: string, family: 'support' | 'music', ep?: number) => ({
  _id: id,
  family,
  ...(ep ? { series: 'the-spectrum', seriesTitle: 'The Spectrum', episodeNumber: ep } : {}),
});

const tracks = [t('ep2', 'support', 2), t('m1', 'music'), t('s1', 'support'), t('ep1', 'support', 1)];

describe('topicRows', () => {
  it('lists standalone tracks first, then each series header with episodes in order', () => {
    expect(topicRows(tracks, 'all').map((r) => r.key)).toEqual(['m1', 's1', 'series:the-spectrum', 'ep1', 'ep2']);
    expect(topicRows(tracks, 'all')[2]).toMatchObject({ type: 'header', title: 'The Spectrum' });
  });

  it('filters by family, dropping a series with no visible episodes', () => {
    expect(topicRows(tracks, 'music').map((r) => r.key)).toEqual(['m1']);
    expect(topicRows(tracks, 'support').map((r) => r.key)).toEqual(['s1', 'series:the-spectrum', 'ep1', 'ep2']);
  });
});
