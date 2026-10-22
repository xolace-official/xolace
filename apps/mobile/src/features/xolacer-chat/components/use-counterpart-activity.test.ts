import { describe, expect, it, vi } from 'vitest';
import { useCounterpartActivity } from './use-counterpart-activity';
import { mountHook } from '@/src/lib/test/mount-hook';

// The real provider drags in stream-chat-expo, which needs a window. Only the
// status read matters here, and the cold-start case is "not ready yet".
vi.mock('../providers/stream-chat-provider', () => ({
  useStreamStatus: () => ({ status: 'connecting', client: null }),
}));

describe('useCounterpartActivity', () => {
  // Cold-start deep link into a thread: the native header mounts before
  // anything has called `connectUser`. The provider hands out `client: null`
  // until then, and the hook has to idle on it rather than reach for a channel.
  it('idles until the provider hands out a connected client', () => {
    expect(() => mountHook(() => useCounterpartActivity('conv_1', 'xolacer_1'))).not.toThrow();
  });
});
