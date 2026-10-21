import { v } from "convex/values";
import { httpAction, internalAction, internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { timingSafeEqual } from "../lib/timingSafeEqual";

/**
 * Deleting ElevenLabs' copy of a talk (#595, decided in #588). Ours is built
 * turn by turn by the Custom LLM endpoint, so by the time the post-call
 * webhook arrives it is already committed: the webhook only triggers the
 * DELETE. Nothing from its transcript or `analysis` is stored.
 */

// ElevenLabs' own SDK tolerance for the signed timestamp.
const SIGNATURE_TOLERANCE_S = 30 * 60;
// Webhook retries stop after ~40.5 min; past this, a talk's webhook is lost.
const SWEEP_AFTER_MS = 60 * 60 * 1000;
const SWEEP_BATCH = 100;
// Backoff doubles from 2 min: ~17 h of retries before giving up.
const PURGE_DELETE_ATTEMPTS = 10;

/** `ElevenLabs-Signature: t=<unix s>,v0=<hex HMAC-SHA256 of "t.body">`. */
async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)));
  const t = Number(parts.t);
  if (!parts.v0 || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > SIGNATURE_TOLERANCE_S) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, parts.v0);
}

/** True once their copy is gone: deleted now, or already (404). */
async function deleteConversation(conversationId: string): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_AGENTS_API_KEY;
  // A failure, not a throw: callers retry, and a throw would skip that.
  if (!apiKey) {
    console.error("[talk] provider delete: ELEVENLABS_AGENTS_API_KEY not set");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
      { method: "DELETE", headers: { "xi-api-key": apiKey } },
    );
    if (res.ok || res.status === 404) return true;
    console.error("[talk] provider delete failed", res.status, await res.text());
  } catch (err) {
    console.error("[talk] provider delete request failed", err);
  }
  return false;
}

/** Past signature checks, always 200: a failed DELETE is the sweeper's to retry. */
export const postCallWebhook = httpAction(async (ctx, request) => {
  const rawBody = await request.text();
  if (!(await verifySignature(rawBody, request.headers.get("ElevenLabs-Signature")))) {
    return new Response("invalid signature", { status: 401 });
  }
  let event: {
    type?: unknown;
    data?: {
      conversation_id?: unknown;
      metadata?: { call_duration_secs?: unknown };
      conversation_initiation_client_data?: { custom_llm_extra_body?: { sessionId?: unknown; talkKey?: unknown } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 200 });
  }
  const conversationId = event.data?.conversation_id;
  if (event.type !== "post_call_transcription" || typeof conversationId !== "string") {
    return new Response(null, { status: 200 });
  }
  // Charge talk time from the connected duration (#596), before the DELETE
  // stamps the talk. Idempotent on its own.
  const durationS = event.data?.metadata?.call_duration_secs;
  if (typeof durationS === "number") {
    const extra = event.data?.conversation_initiation_client_data?.custom_llm_extra_body;
    const talk =
      typeof extra?.sessionId === "string" && typeof extra.talkKey === "string"
        ? { sessionId: extra.sessionId, talkKey: extra.talkKey }
        : undefined;
    await ctx.runMutation(internal.talk.time.settle, { conversationId, durationS, talk });
  }
  // Idempotent: only a talk still awaiting deletion gets a DELETE, so a
  // redelivery does nothing. settle attaches an unattached talk from the
  // echoed key, so it is pending by now.
  if (!(await ctx.runQuery(internal.talk.provider.isPending, { conversationId }))) {
    return new Response(null, { status: 200 });
  }
  if (await deleteConversation(conversationId)) {
    await ctx.runMutation(internal.talk.provider.markProviderDeleted, { conversationIds: [conversationId] });
  }
  return new Response(null, { status: 200 });
});

/** Sessions holding this conversation id whose provider copy isn't deleted yet. */
function pendingSessions(ctx: QueryCtx, conversationId: string) {
  return ctx.db
    .query("sessions")
    .withIndex("by_providerDeletedAt_and_elevenLabsConversationId", (q) =>
      q.eq("providerDeletedAt", undefined).eq("elevenLabsConversationId", conversationId),
    );
}

/** The same, per conversation of a talk (#604): a reopening's live only here. */
function pendingConversations(ctx: QueryCtx, conversationId: string) {
  return ctx.db
    .query("talk_conversations")
    .withIndex("by_providerDeletedAt_and_conversationId", (q) =>
      q.eq("providerDeletedAt", undefined).eq("conversationId", conversationId),
    );
}

export const isPending = internalQuery({
  args: { conversationId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { conversationId }) =>
    (await pendingSessions(ctx, conversationId).first()) !== null ||
    (await pendingConversations(ctx, conversationId).first()) !== null,
});

export const markProviderDeleted = internalMutation({
  args: { conversationIds: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { conversationIds }) => {
    const now = Date.now();
    for (const conversationId of conversationIds) {
      // attachConversation writes an id once per talk: one row, in practice.
      for (const s of await pendingSessions(ctx, conversationId).take(10)) {
        await ctx.db.patch("sessions", s._id, { providerDeletedAt: now });
      }
      for (const c of await pendingConversations(ctx, conversationId).take(10)) {
        await ctx.db.patch("talk_conversations", c._id, { providerDeletedAt: now });
      }
    }
    return null;
  },
});

/** Unstamped talks older than SWEEP_AFTER_MS. */
export const listUnstamped = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const cutoff = Date.now() - SWEEP_AFTER_MS;
    // ponytail: ordered by conversation id, not age, so >100 young or
    // persistently failing talks can crowd out older ones; add a createdAt
    // index (and a give-up stamp) then. Talks end by the agent's 26-min
    // backstop, so createdAt + 1 h is always past the call.
    const pending = await ctx.db
      .query("sessions")
      .withIndex("by_providerDeletedAt_and_elevenLabsConversationId", (q) =>
        q.eq("providerDeletedAt", undefined).gt("elevenLabsConversationId", ""),
      )
      .take(SWEEP_BATCH);
    const conversations = await ctx.db
      .query("talk_conversations")
      .withIndex("by_providerDeletedAt_and_conversationId", (q) =>
        q.eq("providerDeletedAt", undefined).gt("conversationId", ""),
      )
      .take(SWEEP_BATCH);
    return [
      ...new Set([
        ...pending.filter((s) => s.createdAt < cutoff).map((s) => s.elevenLabsConversationId!),
        ...conversations.filter((c) => c._creationTime < cutoff).map((c) => c.conversationId),
      ]),
    ];
  },
});

/** Cron: retries talks whose webhook was lost or whose DELETE failed. */
export const sweep = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.talk.provider.listUnstamped, {});
    const deleted: string[] = [];
    for (const id of ids) if (await deleteConversation(id)) deleted.push(id);
    if (deleted.length) await ctx.runMutation(internal.talk.provider.markProviderDeleted, { conversationIds: deleted });
    return null;
  },
});

/**
 * Scheduled by purgeSessions in the purge's own transaction: once the session
 * is gone these args are the only record of the id, so failures retry here.
 */
export const deleteConversations = internalAction({
  args: { conversationIds: v.array(v.string()), attempt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { conversationIds, attempt = 1 }) => {
    const failed: string[] = [];
    for (const id of conversationIds) if (!(await deleteConversation(id))) failed.push(id);
    if (failed.length && attempt < PURGE_DELETE_ATTEMPTS) {
      await ctx.scheduler.runAfter(2 ** attempt * 60_000, internal.talk.provider.deleteConversations, {
        conversationIds: failed,
        attempt: attempt + 1,
      });
    } else if (failed.length) {
      console.error("[talk] provider delete gave up", failed);
    }
    return null;
  },
});
