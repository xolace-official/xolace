import { describe, expect, it } from 'vitest';
import { connectPlan, type ConnectPlanInput } from '@/src/features/xolacer-chat/connect-plan';

const ME = 'user_me';
const OTHER = 'user_other';
const MINE = { clerkUserId: ME };

const fresh: ConnectPlanInput = {
  cachedEnabled: false,
  cachedCredential: null,
  liveStatus: undefined,
  clerkUserId: ME,
};

describe('connectPlan', () => {
  const cases: { label: string; input: Partial<ConnectPlanInput>; expected: ReturnType<typeof connectPlan> }[] = [
    {
      label: 'fresh install: nothing cached, nothing known — wait for a surface to ask',
      input: {},
      expected: { activateNow: false, resetDb: false, clearCredential: false },
    },
    {
      label: 'returning chat user: cached enabled + own credential → connect on cold start',
      input: { cachedEnabled: true, cachedCredential: MINE },
      expected: { activateNow: true, resetDb: false, clearCredential: false },
    },
    {
      label: 'cached enabled but no credential: no round trip to skip, so no eager connect',
      input: { cachedEnabled: true },
      expected: { activateNow: false, resetDb: false, clearCredential: false },
    },
    {
      label: 'kill switch flipped: cached true, live false → no connect, credential kept',
      input: { cachedEnabled: true, cachedCredential: MINE, liveStatus: false },
      expected: { activateNow: false, resetDb: false, clearCredential: false },
    },
    {
      label: 'live enabled resolves for a first-time chat user → connect',
      input: { liveStatus: true },
      expected: { activateNow: true, resetDb: false, clearCredential: false },
    },
    {
      label: 'Clerk user changed: wipe the other account off the device, no connect yet',
      input: { cachedEnabled: true, cachedCredential: { clerkUserId: OTHER } },
      expected: { activateNow: false, resetDb: true, clearCredential: true },
    },
    {
      label: 'sign-out: user gone → wipe',
      input: { cachedEnabled: true, cachedCredential: MINE, clerkUserId: null },
      expected: { activateNow: false, resetDb: true, clearCredential: true },
    },
    {
      label: 'sign-out with nothing cached: nothing to wipe, no sqlite touched for a non-chat user',
      input: { clerkUserId: null },
      expected: { activateNow: false, resetDb: false, clearCredential: false },
    },
  ];

  for (const c of cases) {
    it(c.label, () => {
      expect(connectPlan({ ...fresh, ...c.input })).toEqual(c.expected);
    });
  }
});
