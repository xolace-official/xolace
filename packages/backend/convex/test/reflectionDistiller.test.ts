// @vitest-environment edge-runtime
/**
 * `reflectionDistiller.distill` executed for real (design: issue #251) — the
 * one downstream job the pipeline tests deliberately do not run, covered here
 * instead so the distillation chain has real coverage at least once.
 *
 * Lives in its own file because `mirrorPipeline.test.ts` must stub this action
 * out to assert the enqueue without running it, and a module cannot be both
 * mocked and real in one file.
 *
 * Only the `action-cache` component is faked — the LLM call. The kept guard,
 * the NULL contract and the write all run against a seeded backend.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { actionCacheMock, aggregatesMock, revenuecatMock } from "./mocks.helpers";

const RAW_TEXT = "another week of shipping and nobody said anything";
const MIRROR = "The deadline is not the weight. Being unseen while carrying it is.";

const stub = vi.hoisted(() => ({ distilled: undefined as unknown }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../ai/cached", () => actionCacheMock(() => ({ distilled: stub.distilled })));

beforeEach(() => {
  stub.distilled = undefined;
});

const readSession = (user: SeededUser, sessionId: Id<"sessions">) =>
  user.root.run((ctx) => ctx.db.get("sessions", sessionId));

const distill = (user: SeededUser, sessionId: Id<"sessions">) =>
  user.root.action(internal.jobs.reflectionDistiller.distill, {
    sessionId,
    rawText: RAW_TEXT,
    mirrorText: MIRROR,
    primaryEmotion: "anxiety",
    intensity: 5,
    thematicTags: ["work"],
    userLanguageTags: ["stretched thin"],
  });

describe("reflectionDistiller.distill", () => {
  it("stores the distilled text on a kept session", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    stub.distilled = "I kept shipping and waited for someone to notice.";

    await distill(user, sessionId);

    expect((await readSession(user, sessionId))?.distilledText).toBe(
      stub.distilled,
    );
  });

  it("stores nothing when the model returns NULL", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    stub.distilled = "NULL";

    await distill(user, sessionId);

    expect((await readSession(user, sessionId))?.distilledText).toBeUndefined();
  });

  it("skips a session the user chose not to keep", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, {
      kept: false,
    });
    stub.distilled = "should never be written";

    await distill(user, sessionId);

    expect((await readSession(user, sessionId))?.distilledText).toBeUndefined();
  });

  it("swallows a provider outage rather than failing the job", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    stub.distilled = new Error("529 overloaded_error");

    await expect(distill(user, sessionId)).resolves.not.toThrow();

    expect((await readSession(user, sessionId))?.distilledText).toBeUndefined();
  });
});
