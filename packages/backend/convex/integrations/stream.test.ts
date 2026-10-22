import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mintUserToken, USER_TOKEN_TTL_SECONDS } from './stream';

const decodePayload = (jwt: string) => {
  const body = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
};

describe('mintUserToken', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.STREAM_API_KEY = 'key';
    process.env.STREAM_API_SECRET = 'secret';
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it('carries a 30-day exp so a lost device stops reading on its own', async () => {
    const before = Math.floor(Date.now() / 1000);
    const payload = decodePayload(await mintUserToken('profile_1'));
    expect(payload.user_id).toBe('profile_1');
    expect(USER_TOKEN_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(payload.exp).toBeGreaterThanOrEqual(before + USER_TOKEN_TTL_SECONDS);
    expect(payload.exp).toBeLessThanOrEqual(before + USER_TOKEN_TTL_SECONDS + 5);
  });
});
