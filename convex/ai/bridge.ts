import { ConvexError, v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import {
  getAnthropicClient,
  ARTICULATOR_MODEL,
  extractTextFromResponse,
  thinkingOff,
} from "./providers/anthropic";
import { requireAuth, requireSessionOwnership } from "../lib/auth";
import { hasPremium } from "../lib/premium";
import {
  BRIDGE_CALLS_PER_DRAFT,
  BRIDGE_DRAFTS_FREE,
  BRIDGE_DRAFTS_PLUS,
  BRIDGE_DRAFT_LIMITS_PLUS,
  rateLimiter,
} from "../lib/rateLimits";

// These strings are interpolated straight into the prompt, so they are both a
// token-spend surface and an injection surface. Real values are short.
const MAX_RECIPIENT_NAME = 60;
const MAX_RELATIONSHIP = 40;
const MAX_ADDRESS_TERM = 40;

// Relationships the user is typically safe being fully raw with.
// Anyone else gets a measured-disclosure instruction — over-sharing to a
// distant or formal recipient is the dangerous failure mode, so default to
// caution when unsure.
const INTIMATE_RELATIONSHIPS = new Set([
  "partner",
  "spouse",
  "husband",
  "wife",
  "boyfriend",
  "girlfriend",
  "significant other",
  "best friend",
]);

type BridgeContext = {
  mirrorText: string | null;
  rawInput: string | null;
  intensity: number | null;
  specificity: number | null;
  userLanguageTags: string[];
  turnInputs: string[];
};

export const gatherBridgeContext = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<BridgeContext> => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    // Bounded by design: a session has at most MAX_TURNS (2) refinement turns.
    const turns = await ctx.db
      .query("session_turns")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(3);

    return {
      mirrorText: session.mirrorText ?? null,
      rawInput: session.rawInput ?? null,
      intensity: metadata?.intensity ?? null,
      specificity: metadata?.specificity ?? null,
      userLanguageTags: metadata?.userLanguageTags ?? [],
      turnInputs: turns
        .map((t) => t.userInput)
        .filter((x): x is string => !!x && x.trim().length > 0),
    };
  },
});

/**
 * Charge one Anthropic call against the caller's daily bridge budget.
 * Consumed BEFORE the model call, never after: a check-then-generate pair
 * leaves a window where N concurrent requests all pass the check.
 */
export const consumeBridgeQuota = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const isPremium = await hasPremium(ctx, profile);

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "bridgeDraft", {
      key: profile._id,
      ...(isPremium ? { config: BRIDGE_DRAFT_LIMITS_PLUS } : {}),
    });

    return { ok, retryAfter: retryAfter ?? 0, isPremium };
  },
});

/**
 * Credit back a token when the model call itself failed. The user should never
 * lose a draft to an Anthropic timeout or an empty completion.
 *
 * A negative `count` is a refund: the component subtracts count from the
 * bucket, and only rejects `count > capacity`. Safe because we refund exactly
 * once, only after a consume in the same request succeeded.
 */
export const refundBridgeQuota = internalMutation({
  args: { isPremium: v.boolean() },
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    await rateLimiter.limit(ctx, "bridgeDraft", {
      key: profile._id,
      count: -1,
      ...(args.isPremium ? { config: BRIDGE_DRAFT_LIMITS_PLUS } : {}),
    });

    return null;
  },
});

/**
 * Non-consuming read of the caller's remaining bridge budget, so the UI can
 * show what's left (and the Plus upsell) before they tap generate.
 */
export const getQuota = query({
  args: {},
  returns: v.object({
    isPremium: v.boolean(),
    draftsRemaining: v.number(),
    draftsTotal: v.number(),
    plusDrafts: v.number(),
    resetsAt: v.number(),
  }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const isPremium = await hasPremium(ctx, profile);

    const { value, ts, config } = await rateLimiter.getValue(
      ctx,
      "bridgeDraft",
      {
        key: profile._id,
        ...(isPremium ? { config: BRIDGE_DRAFT_LIMITS_PLUS } : {}),
      },
    );

    // `value` is in calls. One call still buys a full draft (it just leaves no
    // retry behind it), so round UP — a user holding a lone retry token has one
    // more draft in them, and telling them "0 left" would be wrong.
    const callsLeft = Math.max(0, Math.floor(value));

    return {
      isPremium,
      draftsRemaining: Math.ceil(callsLeft / BRIDGE_CALLS_PER_DRAFT),
      draftsTotal: isPremium ? BRIDGE_DRAFTS_PLUS : BRIDGE_DRAFTS_FREE,
      plusDrafts: BRIDGE_DRAFTS_PLUS,
      resetsAt: ts + config.period,
    };
  },
});

type DraftInput = BridgeContext & {
  recipientName: string;
  recipientRelationship?: string;
  addressTerm?: string;
};

function buildBridgePrompt(input: DraftInput): string {
  const {
    mirrorText,
    rawInput,
    intensity,
    userLanguageTags,
    turnInputs,
    recipientName,
    recipientRelationship,
    addressTerm,
  } = input;

  // The user's own words — used to match their REGISTER (how they talk), not as
  // the source of meaning. The meaning is the mirror they already confirmed.
  const userWords = [rawInput, ...turnInputs, ...userLanguageTags]
    .filter(Boolean)
    .join(" / ")
    .trim();
  // --- Signal -> instruction. Numbers never reach the prompt as numbers. ---

  // register: match how they actually talk, when we have their words.
  const register = userWords
    ? `This is how they put it themselves: "${userWords}". Echo their vocabulary and tone where it's natural, so the message sounds like them and not like you.`
    : `You don't have their own words for this, so keep the language plain and everyday — nothing fancier than how they'd actually text.`;

  // shape: length is need-driven, not capped. The failure mode is padding to
  // feel "complete," not length itself — a long message is fine when the
  // feeling genuinely needs the room, and a single line is fine when it
  // doesn't. The fence is only against filler.
  const shape =
    "Let the length follow what genuinely needs to be said — as long as it needs to be, and no longer. A single honest line can be the whole message; so can several sentences when there's really that much to it. The one thing to avoid is padding: adding sentences to sound warm, complete, or profound after the real thing has already been said. That padding is what reads as 'an AI wrote this' — not length itself.";

  // pitch: intensity.
  const heavy = intensity != null && intensity >= 7;
  const pitch = heavy
    ? "This sits heavy. Don't downplay it, it's okay for the message to carry real weight."
    : "This is quiet, not urgent or in crisis. Keep it low-key and unalarming.";

  // closeness: disclosure depth, gated by relationship.
  const intimate = recipientRelationship
    ? INTIMATE_RELATIONSHIPS.has(recipientRelationship.toLowerCase())
    : false;
  const closeness = intimate
    ? "This is someone they're safe being raw with, they can be fully open."
    : "This is not someone they bare everything to. Convey that something is heavy and they want to connect, WITHOUT dumping the rawest specifics. Signal, don't over-disclose.";

  // opener: address term is the one field a prompt can't infer.
  const opener = addressTerm
    ? `Open with "${addressTerm}" — that's what they actually call this person.`
    : recipientRelationship
      ? `Open with a warm, natural greeting for a ${recipientRelationship}. Do NOT open with their legal first name — almost no one starts a heavy message to someone close that way.`
      : `Open with a warm, natural greeting. You may use "${recipientName}" only if a casual first-name greeting genuinely fits.`;

  return `You are helping someone write the FIRST message to a person they want to talk to, right after a private session where an AI helped them find precise words for a feeling they couldn't name on their own.

The whole point: they now UNDERSTAND what they're feeling. Your job is to hand them the words to OPEN the conversation with that understanding intact — so they DON'T have to start with "I don't know how to explain this." Handing that wordlessness back to them is the one thing you must never do; it undoes the help they just got.

The precise feeling they confirmed (this is WHAT to convey — say this same understanding, but in plain spoken first-person, the way they'd actually say it out loud; translate the meaning, never quote the phrasing or borrow its imagery):
"${mirrorText}"

How to write it:
- They want to reach out to ${recipientRelationship ? `their ${recipientRelationship}` : "this person"}.
- ${register}
- ${pitch}
- ${closeness}

Rules:
- First person, as if they're typing it on their phone — plain and human, never poetic or clinical.
- Say the actual feeling in everyday words. Do NOT retreat into "I can't explain it," "I don't have the words," or vague gestures — the whole session existed to get them past that.
- ${shape}
- ${opener}
- The message has to open the conversation and never close it off. Leave the other person something they'll want to respond to — but that pull is usually carried by the honest line itself, so an explicit ask is optional, not required. When something like an invitation fits, let it grow out of what was said; vary it every time and never reach for the same stock closing question. Do NOT end on a line that wraps the feeling up neatly or signs off — that quietly closes the door you're trying to leave open.
- NEVER write "no need to respond," "just wanted you to know," "you were on my mind," or anything that excuses them from replying or turns the message into a note ABOUT the recipient. They are reaching out to be met, not to perform affection.

Write only the message, nothing else.`;
}

async function _generateDraft(input: DraftInput): Promise<string> {
  const client = getAnthropicClient();
  const prompt = buildBridgePrompt(input);

  const response = await client.messages.create({
    model: ARTICULATOR_MODEL,
    max_tokens: 300,
    thinking: thinkingOff(ARTICULATOR_MODEL),
    messages: [{ role: "user", content: prompt }],
  });

  const draft = extractTextFromResponse(response).trim();
  if (!draft) {
    throw new Error("Articulator returned empty draft");
  }

  return draft;
}

export const requestBridgeDraft = action({
  args: {
    sessionId: v.id("sessions"),
    recipientName: v.string(),
    recipientRelationship: v.optional(v.string()),
    addressTerm: v.optional(v.string()),
  },
  returns: v.object({ draft: v.string() }),
  handler: async (ctx, args) => {
    const context = (await ctx.runQuery(
      internal.ai.bridge.gatherBridgeContext,
      { sessionId: args.sessionId },
    )) as BridgeContext;

    if (!context.mirrorText) {
      throw new Error("No mirror text for this session");
    }

    const trimmedRecipientName = args.recipientName
      ?.trim()
      .slice(0, MAX_RECIPIENT_NAME);
    const trimmedRecipientRelationship =
      args.recipientRelationship?.trim().slice(0, MAX_RELATIONSHIP) || undefined;
    const trimmedAddressTerm =
      args.addressTerm?.trim().slice(0, MAX_ADDRESS_TERM) || undefined;

    if (!trimmedRecipientName) {
      throw new Error("Recipient name is required");
    }

    // Everything above is free. The model call below is not.
    const { ok, retryAfter, isPremium } = await ctx.runMutation(
      internal.ai.bridge.consumeBridgeQuota,
      {},
    );
    if (!ok) {
      throw new ConvexError({
        code: "bridge_rate_limited",
        retryAfter,
        isPremium,
      });
    }

    let draft: string;
    try {
      draft = await _generateDraft({
        ...context,
        recipientName: trimmedRecipientName,
        recipientRelationship: trimmedRecipientRelationship,
        addressTerm: trimmedAddressTerm,
      });
    } catch (error) {
      await ctx.runMutation(internal.ai.bridge.refundBridgeQuota, {
        isPremium,
      });
      throw error;
    }

    return { draft };
  },
});

// Eval-only harness — kept intentionally for ongoing prompt evaluation.
// Bypasses the DB/auth/session lookup so we can drive buildBridgePrompt with
// injected inputs and see which branches fire (returns both prompt and draft).
// Internal — never public API. Run via the Convex dashboard or `mcp__convex__run`
// against `internal.ai.bridge.evalBridgeDraft`. Do NOT remove as dead code.
export const evalBridgeDraft = internalAction({
  args: {
    mirrorText: v.string(),
    rawInput: v.optional(v.string()),
    intensity: v.optional(v.number()),
    specificity: v.optional(v.number()),
    userLanguageTags: v.optional(v.array(v.string())),
    turnInputs: v.optional(v.array(v.string())),
    recipientName: v.string(),
    recipientRelationship: v.optional(v.string()),
    addressTerm: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const input: DraftInput = {
      mirrorText: args.mirrorText,
      rawInput: args.rawInput ?? null,
      intensity: args.intensity ?? null,
      specificity: args.specificity ?? null,
      userLanguageTags: args.userLanguageTags ?? [],
      turnInputs: args.turnInputs ?? [],
      recipientName: args.recipientName,
      recipientRelationship: args.recipientRelationship,
      addressTerm: args.addressTerm?.trim() || undefined,
    };
    return {
      prompt: buildBridgePrompt(input),
      draft: await _generateDraft(input),
    };
  },
});
