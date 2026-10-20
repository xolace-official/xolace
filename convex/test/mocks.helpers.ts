/**
 * Factories for the Convex *components* the test backend cannot register:
 * `@convex-dev/aggregate`, `@convex-dev/rate-limiter`, `@convex-dev/action-cache`,
 * `@convex-dev/rag`, `@convex-dev/workflow`, posthog (design: issue #242).
 *
 * Each factory returns the module shape `vi.mock` should install. Apply them
 * per test file, top-of-file, never in `vitest.setup.ts` — a file that wants
 * the real module must be able to simply not call the factory:
 *
 * ```ts
 * vi.mock("../lib/aggregates", () => aggregatesMock());
 * // partial: keep the module's real constants, swap only the component
 * vi.mock("../lib/rateLimits", async (orig) => ({
 *   ...(await orig<typeof import("../lib/rateLimits")>()),
 *   ...rateLimiterMock(),
 * }));
 * ```
 *
 * Only mock what the file under test actually reaches. An unused mock is a
 * real code path silently stubbed out.
 */
import { internalAction } from "../_generated/server";

/** `convex/lib/aggregates` — writes are no-ops; nothing reads ranks back. */
export const aggregatesMock = () => ({
  reflectionRank: {},
  rankInsert: async () => {},
  rankReplace: async () => {},
  rankDelete: async () => {},
});

/**
 * A fixed value, or a getter read at call time. `vi.mock` factories are
 * hoisted above every `it`, so a file whose branches need different values
 * passes a getter over a `vi.hoisted` holder and sets it per test.
 */
export type Lazy<T> = T | (() => T);
const unwrap = <T>(v: Lazy<T>): T =>
  typeof v === "function" ? (v as () => T)() : v;

/**
 * The `rateLimiter` half of `convex/lib/rateLimits` — allow by default. Pass
 * `{ ok: false, retryAfter }` to exercise a rate-limited branch. Spread over
 * the real module so the limit constants stay real.
 */
export const rateLimiterMock = (
  limit: Lazy<{ ok: boolean; retryAfter?: number }> = { ok: true },
) => ({
  rateLimiter: {
    limit: async () => unwrap(limit),
    check: async () => unwrap(limit),
    reset: async () => {},
  },
});

/**
 * A registered internal action that does nothing, to spread over a module
 * whose job is scheduled by the code under test.
 *
 * `convex-test` schedules on a real `setTimeout`, so a `runAfter(0, …)` job
 * genuinely runs — `ai/tts:generateMirrorAudio` reaches ElevenLabs the moment
 * `ELEVENLABS_VOICE_API_KEY` is present, and a job that fires after its test
 * body has finished reads whatever the *next* test set. A test that asserts
 * the enqueue must neuter the callee.
 *
 * No args validator on purpose: this stands in for several signatures, and
 * validating args it is about to ignore would only make it brittle.
 */
export const noopJob = () => internalAction({ handler: async () => null });

/** `convex/posthog` — analytics capture is fire-and-forget. */
export const posthogMock = () => ({
  posthog: { capture: async () => {} },
});

/** `convex/revenuecat` — entitlement state. `hasPremium` stays real. */
export const revenuecatMock = (hasEntitlement: Lazy<boolean> = false) => ({
  // registerRoutes: http.ts runs it when a test fetches a route.
  revenuecat: { hasEntitlement: async () => unwrap(hasEntitlement), registerRoutes: () => {} },
});

/**
 * `convex/rag` — the search half of the shared RAG instance. Defaults to a
 * cold namespace (nothing retrieved), which is what a first-session profile
 * genuinely looks like. `searchEpisodicMemory` itself stays real.
 */
export const ragMock = (
  result: {
    entries?: { entryId: string; key?: string; text: string }[];
    results?: { entryId: string; score: number }[];
  } = {},
  /** Sink for keys passed to `deleteByKeyAsync` — pass one to assert a purge. */
  deletedKeys?: string[],
) => ({
  REFLECTION_POOL_NAMESPACE: "reflection-pool",
  NO_GRANULAR_LABEL: "",
  EPISODIC_STATUS: "n/a",
  REPLY_STATUS: "reply",
  NO_PRIMARY_EMOTION: "n/a",
  rag: {
    search: async () => ({
      entries: result.entries ?? [],
      results: result.results ?? [],
    }),
    add: async () => {},
    getNamespace: async () => ({ namespaceId: "ns_test" }),
    deleteByKeyAsync: async (_ctx: unknown, args: { key: string }) => {
      deletedKeys?.push(args.key);
    },
  },
});

/**
 * `convex/ai/cached` — the three `@convex-dev/action-cache` wrappers. This is
 * the provider seam for the pipeline: each `fetch` resolves to whatever the
 * test hands it, so a branch is steered by the value the model "returned"
 * rather than by a wire stub. Pass a thrown value to exercise a provider
 * outage.
 */
export const actionCacheMock = (
  results: Lazy<{
    moderation?: unknown;
    classification?: unknown;
    distilled?: unknown;
  }>,
) => {
  const fetcher = (pick: (r: Record<string, unknown>) => unknown) => ({
    fetch: async () => {
      const value = pick(unwrap(results) as Record<string, unknown>);
      if (value instanceof Error) throw value;
      return value;
    },
  });
  return {
    moderationCache: fetcher((r) => r.moderation),
    classifierCache: fetcher((r) => r.classification),
    distillerCache: fetcher((r) => r.distilled),
  };
};

/**
 * `convex/ai/providers/anthropic` — the articulator boundary only. Spread over
 * the real module so model ids, versions, `extractTextFromResponse` and
 * `parseClassificationResponse` stay real; only the network client is faked.
 * A getter returning an `Error` makes `messages.create` reject, which is the
 * fallback-mirror branch.
 */
export const anthropicMock = (reply: Lazy<string | Error>) => ({
  getAnthropicClient: () => ({
    messages: {
      create: async () => {
        const value = unwrap(reply);
        if (value instanceof Error) throw value;
        return {
          content: [{ type: "text", text: value }],
          usage: { input_tokens: 0, output_tokens: 0 },
        };
      },
    },
  }),
});

// The workflow factory lands with the test that first reaches it — its return
// shape is only knowable against a real call site, and a guessed one stubs out
// the thing under test.
