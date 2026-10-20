// @vitest-environment edge-runtime
/**
 * Talk start is Plus only (#594). Failure modes: a free caller gets a
 * session, or reaches ElevenLabs for a token.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { asNewUser } from "../test/harness.helpers";
import { aggregatesMock, posthogMock, ragMock, rateLimiterMock, revenuecatMock } from "../test/mocks.helpers";

const stub = vi.hoisted(() => ({ isPlus: true }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../lib/rateLimits", async (orig) => ({
  ...(await orig<typeof import("../lib/rateLimits")>()),
  ...rateLimiterMock(),
}));
vi.mock("../revenuecat", () => revenuecatMock(() => stub.isPlus));

let elevenlabs: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stub.isPlus = true;
  vi.stubEnv("ELEVENLABS_AGENTS_API_KEY", "key");
  vi.stubEnv("TALK_AGENT_ID", "agent");
  elevenlabs = vi.fn(async () => Response.json({ token: "tok" }));
  vi.stubGlobal("fetch", elevenlabs);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("talk.live.start (#594)", () => {
  it("starts a talk for a Plus caller", async () => {
    const { t } = await asNewUser();
    const { token, sessionId } = await t.action(api.talk.live.start, {});
    expect(token).toBe("tok");
    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.entryType).toBe("talk");
  });

  it("refuses a free caller before any session or token", async () => {
    stub.isPlus = false;
    const { t } = await asNewUser();
    await expect(t.action(api.talk.live.start, {})).rejects.toThrow("Xolace+ required: talk");
    expect(elevenlabs).not.toHaveBeenCalled();
    const sessions = await t.run((ctx) => ctx.db.query("sessions").take(10));
    expect(sessions).toHaveLength(0);
  });
});
