import { ConvexError, v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  MutationCtx, QueryCtx
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";
import { purgeModerationEvents } from "./lib/conversationErasure";
import {
  camperName,
  camperTagOf,
  generateCamperTag,
  GENERIC_CAMPER_NAME,
  legacyCamperTag,
} from "./lib/camperTag";
import {
  type ChatNotificationType,
  chatNotificationsAllowed,
  conversationIdFromChannelId,
  messageNotificationRecipient,
  messageNotificationSuppressed,
  messageNotifiedField,
  xolacerChannelId,
} from "./lib/chatNotifications";
import { XOLACE_BROADCAST_CHANNEL_TYPE, XOLACE_CHANNEL_ID } from "./lib/streamSetup";
import {
  conversationOrigin,
  type ConversationOrigin,
  meetsRatingFloor,
  rankSuggestionCandidates,
  SUGGESTION_ORIGIN_WINDOW_MS,
} from "./lib/xolacerSuggestion";
import { posthog } from "./posthog";
import { presentProfileIds } from "./presence";
import {
  createXolacerChannel,
  deleteStreamUser,
  freezeStreamChannel,
  getStreamApiKey,
  mintUserToken,
  upsertStreamUsers,
} from "./integrations/stream";
import {
  bothPartiesDeleted,
  canDelete,
  canManualRest,
  canRate,
  declineCooldownUntil,
  hasRequestExpired,
  isArchivedFor,
  isAtOpenCap,
  isBlocked,
  isPairBlocked,
  planBlock,
  presenceDisclosed,
} from "./lib/conversationGating";
import { conversationRoleValidator } from "./lib/validators";
import { MAX_SPECIALTIES, specialtyValidator } from "./lib/specialties";

const statusValidator = v.union(
  v.literal("requested"),
  v.literal("open"),
  v.literal("resting"),
  v.literal("closed"),
);
/** Every lifecycle status, for scans that must cover all of them. */
const STATUSES = ["requested", "open", "resting", "closed"] as const;

const closedReasonValidator = v.optional(
  v.union(
    v.literal("declined"),
    v.literal("expired"),
    v.literal("blocked"),
    v.literal("xolacer_left"),
  ),
);
const originValidator = v.optional(
  v.union(v.literal("suggestion"), v.literal("direct")),
);
/**
 * Why a `resting` row is resting. Absent on rows that rested before the field
 * existed, which read the same as `"quiet"` — the sweep is what put them there.
 */
const restingReasonValidator = v.optional(
  v.union(v.literal("manual"), v.literal("quiet")),
);
const pairConversationRowValidator = v.object({
  kind: v.literal("pair"),
  id: v.id("xolacer_conversations"),
  role: v.union(v.literal("user"), v.literal("xolacer")),
  status: statusValidator,
  closedReason: closedReasonValidator,
  streamChannelId: v.optional(v.string()),
  lastMessageAt: v.optional(v.number()),
  requestedAt: v.number(),
  // Stable identity for the xolacer side of the thread — the roster matches
  // on this, never on display name (names repeat and can change).
  xolacerProfileId: v.id("emotional_profiles"),
  // The other party's profile id — what a report is filed against, because a
  // display name repeats and can change. No new exposure: this is also the
  // Stream user id, so the client already sees it on every message.
  counterpartProfileId: v.id("emotional_profiles"),
  counterpartName: v.string(),
  counterpartPhotoUrl: v.optional(v.string()),
  restingReason: restingReasonValidator,
  /**
   * The other party is in the app right now. Convex, never Stream — Stream
   * owns presence inside an open thread and nowhere else, and this list is
   * outside every thread. The two definitions ("socket connected" vs "app
   * foregrounded") will occasionally disagree, and the thread header being the
   * more accurate of the two is the correct direction for that error to point.
   *
   * False on any row `presenceDisclosed` closes, so a resting or closed
   * conversation reports nothing about the person on the other side of it.
   */
  counterpartPresent: v.boolean(),
  // Xolacer-side only — the seeker never learns how their own request was
  // stamped. Absent on rows predating the feature, which read as direct.
  origin: originValidator,
  /**
   * Hidden from this viewer's default list right now. Carried on the row
   * rather than filtered out server-side so the default list and the Archived
   * view are two filters over one subscription — a second query would mean a
   * second read set for a list that is mounted for the app's lifetime.
   */
  archived: v.boolean(),
});

/**
 * The synthetic Xolace-channel row (#377, CONTEXT.md "The Xolace channel").
 * A separate object rather than an all-optional `conversationRowValidator` —
 * `xolacerProfileId`/`counterpartProfileId` stay non-optional for every other
 * consumer, which assumes they're always present on a row.
 *
 * No unread count here: that's read live off Stream's own channel state,
 * client-side, the same way every other row's badge is — see
 * `useConversationUnreadCount`. `lastMessageAt`/`lastMessageText` are the one
 * thing actually cached (#376), for the row's preview line and sort key.
 */
const broadcastConversationRowValidator = v.object({
  kind: v.literal("broadcast"),
  id: v.string(),
  streamChannelId: v.string(),
  channelType: v.string(),
  lastMessageAt: v.optional(v.number()),
  lastMessageText: v.optional(v.string()),
});

const conversationRowValidator = v.union(
  pairConversationRowValidator,
  broadcastConversationRowValidator,
);

// Volume cap counts OPEN conversations only — resting/closed free the slot.
export const MAX_OPEN_CONVERSATIONS = 8;
/**
 * The seeker's side of the same ceiling. Lower than the xolacer's 8 because
 * the load is the opposite shape: a volunteer holds space for many people,
 * someone seeking support spread across more than three threads is not being
 * heard in any of them.
 *
 * Enforced only on new transitions. Seekers already past it when this shipped
 * keep every conversation they have — a cap that retroactively closed threads
 * would be the app walking out on someone mid-sentence.
 */
export const MAX_SEEKER_OPEN_CONVERSATIONS = 3;
/**
 * Outbound requests a seeker may have awaiting an answer at once. Only
 * "requested" rows count — once a xolacer accepts or declines, the slot is
 * free again. Without this a user can blanket every xolacer in the directory.
 */
export const MAX_PENDING_REQUESTS = 2;
const RESTING_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Below this, no average is shown anywhere — one bad night shouldn't read as
 * a xolacer's score, and a 5.0 from a single rating is worse than no number
 * at all. Enforced server-side so the client never receives a hideable value.
 */
const MIN_RATINGS_TO_DISPLAY = 5;

/**
 * Ceiling on how many specialty-declaring xolacers sessionSuggestion will pay
 * per-candidate reads for. A safety valve, not a tuning knob: at any plausible
 * roster size the specialty filter yields far fewer than this, so it should
 * never bind. If it ever does, ranking sees a subset and least-loaded stops
 * being exact — which is the signal to index specialties properly.
 */
const MAX_SUGGESTION_CANDIDATES = 200;

/** Public rating shape: the average exists only past the display threshold. */
function publicRating(profile: Doc<"xolacer_profiles">) {
  const count = profile.ratingCount ?? 0;
  return {
    rating:
      count >= MIN_RATINGS_TO_DISPLAY
        ? Math.round(((profile.ratingSum ?? 0) / count) * 10) / 10
        : undefined,
    ratingCount: count,
  };
}

// Global kill-switch (env-var gate, same pattern as devTools). The feature
// ships dark until the ambassador-consent + DPA review clears.
function chatEnabled() {
  return process.env.XOLACER_CHAT_ENABLED === "true";
}

/**
 * How many of a xolacer's pair rows per status the collision check reads.
 * ponytail: a truncated scan can miss a tag and let a duplicate name through.
 * Open threads are capped at 8, and the busiest xolacer on record holds 3 rows
 * in any one status, so it does not bind. If closed rows ever approach it,
 * persist a per-xolacer taken-tag set rather than raising this.
 */
const MAX_TAG_SCAN = 200;

/**
 * Camper tags this xolacer's other pairs already hold.
 *
 * One take per status rather than a single prefix take over the whole
 * xolacer: `by_xolacer_and_status` orders by status, and "closed" sorts first,
 * so one capped scan of the prefix would fill with old closed rows and miss
 * the live ones sitting side by side in the inbox — the only place a
 * collision is ever visible. Closed rows are read too, since a closed pair
 * keeps its tag and brings it back if it ever reopens.
 */
async function takenCamperTags(
  ctx: QueryCtx,
  xolacerProfileId: Id<"emotional_profiles">,
  except?: Id<"xolacer_conversations">,
) {
  const tags: string[] = [];
  for (const status of STATUSES) {
    const rows = await ctx.db
      .query("xolacer_conversations")
      .withIndex("by_xolacer_and_status", (q) =>
        q.eq("xolacerProfileId", xolacerProfileId).eq("status", status),
      )
      .take(MAX_TAG_SCAN);
    for (const row of rows) {
      // Unhealed rows count too: they are displayed under their legacy tag,
      // so drawing onto one would duplicate a name already in this inbox.
      if (row._id !== except) tags.push(camperTagOf(row));
    }
  }
  return tags;
}

/**
 * What this pair's xolacer calls this pair's seeker. Read-only: a query cannot
 * write, so a row predating the field falls back to a value derived from its
 * own id — per-pair, so it closes the correlation gap the same way a drawn tag
 * does, and stable, so this and `ensureCamperName` never disagree about the
 * name while a row waits to heal.
 *
 * Pre-existing rows therefore rename once, when this ships: their old name
 * came off the *seeker's* id, this one off the *pair's*. That rename is the
 * point — leaving those rows on the old value would leave every conversation
 * that predates this change correlatable forever.
 */
function camperNameOf(conversation: Doc<"xolacer_conversations">) {
  return camperName(camperTagOf(conversation));
}

/** The same name from a mutation, healed onto the row if it was missing. */
async function ensureCamperName(
  ctx: MutationCtx,
  conversation: Doc<"xolacer_conversations">,
) {
  if (conversation.camperTag) return camperName(conversation.camperTag);
  const tag = generateCamperTag(
    await takenCamperTags(ctx, conversation.xolacerProfileId, conversation._id),
    legacyCamperTag(conversation._id),
  );
  await ctx.db.patch("xolacer_conversations", conversation._id, { camperTag: tag });
  return camperName(tag);
}

/**
 * Anyone's anonymous chat picture — the catalog avatar they chose.
 * `avatars.url` is already a denormalized public storage URL, so Stream takes
 * it as-is. Curated illustrations only, never a photo, so it leaks nothing the
 * pseudonym doesn't — which is why it's also the right picture for a published
 * xolacer's own Stream record.
 *
 * Two reads per row in myConversations (up to 100 conversations) is the only
 * cost worth naming; if that ever bites, denormalize avatarUrl onto
 * xolacer_conversations at request time. Not yet.
 */
async function catalogAvatar(ctx: QueryCtx, profileId: Id<"emotional_profiles">) {
  const prefs = await ctx.db
    .query("preferences")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
    .unique();
  const avatar = await ctx.db
    .query("avatars")
    .withIndex("by_key", (q) => q.eq("key", prefs?.avatarId ?? "default"))
    .unique();
  return avatar?.url;
}

async function countOpen(ctx: QueryCtx, xolacerProfileId: Id<"emotional_profiles">) {
  const open = await ctx.db
    .query("xolacer_conversations")
    .withIndex("by_xolacer_and_status", (q) =>
      q.eq("xolacerProfileId", xolacerProfileId).eq("status", "open"),
    )
    .take(MAX_OPEN_CONVERSATIONS);
  return open.length;
}

/** Conversations a seeker currently holds open. Stops at the cap. */
async function countOpenAsSeeker(
  ctx: QueryCtx,
  userProfileId: Id<"emotional_profiles">,
) {
  const open = await ctx.db
    .query("xolacer_conversations")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userProfileId", userProfileId).eq("status", "open"),
    )
    .take(MAX_SEEKER_OPEN_CONVERSATIONS);
  return open.length;
}

/**
 * Guard for any transition that would put another conversation into "open" for
 * either party. Distinct error code from `pending_request_limit` so the client
 * can say which ceiling was hit, and `party` so the message names the right
 * person — the xolacer hitting this on accept is not the one who is full.
 */
async function requireOpenSlot(
  ctx: QueryCtx,
  party: "seeker" | "xolacer",
  profileId: Id<"emotional_profiles">,
) {
  const [openCount, cap] =
    party === "seeker"
      ? [await countOpenAsSeeker(ctx, profileId), MAX_SEEKER_OPEN_CONVERSATIONS]
      : [await countOpen(ctx, profileId), MAX_OPEN_CONVERSATIONS];
  if (isAtOpenCap(openCount, cap)) {
    throw new ConvexError({ code: "open_conversation_limit", max: cap, party });
  }
}

/**
 * Both rows that can exist between two people — `forward` where the first
 * argument asked, `reverse` where the second did. Two point lookups on
 * `by_user_and_xolacer`, never a scan. The pair, not the row, is the unit a
 * block applies to, so every gate reads both.
 */
async function loadPairRows(
  ctx: QueryCtx,
  userProfileId: Id<"emotional_profiles">,
  xolacerProfileId: Id<"emotional_profiles">,
) {
  const forward = await ctx.db
    .query("xolacer_conversations")
    .withIndex("by_user_and_xolacer", (q) =>
      q.eq("userProfileId", userProfileId).eq("xolacerProfileId", xolacerProfileId),
    )
    .unique();
  const reverse = await ctx.db
    .query("xolacer_conversations")
    .withIndex("by_user_and_xolacer", (q) =>
      q.eq("userProfileId", xolacerProfileId).eq("xolacerProfileId", userProfileId),
    )
    .unique();
  return { forward, reverse };
}

/** `isPairBlocked` over both rows, for the gates that need only the verdict. */
async function loadPairBlocked(
  ctx: QueryCtx,
  userProfileId: Id<"emotional_profiles">,
  xolacerProfileId: Id<"emotional_profiles">,
) {
  const { forward, reverse } = await loadPairRows(
    ctx,
    userProfileId,
    xolacerProfileId,
  );
  return isPairBlocked(forward, reverse);
}

/** Outbound requests a seeker has awaiting an answer. Stops at the cap. */
async function countPendingRequests(
  ctx: QueryCtx,
  userProfileId: Id<"emotional_profiles">,
) {
  const pending = await ctx.db
    .query("xolacer_conversations")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userProfileId", userProfileId).eq("status", "requested"),
    )
    .take(MAX_PENDING_REQUESTS);
  return pending.length;
}

/**
 * Guard for any transition that puts a row into "requested". Distinct error
 * code so the client can say "waiting on 2 already" instead of blaming the
 * xolacer's availability.
 */
async function requirePendingRequestSlot(
  ctx: QueryCtx,
  userProfileId: Id<"emotional_profiles">,
) {
  if ((await countPendingRequests(ctx, userProfileId)) >= MAX_PENDING_REQUESTS) {
    throw new ConvexError({
      code: "pending_request_limit",
      max: MAX_PENDING_REQUESTS,
    });
  }
}

function xolacerAvailable(
  profile: Doc<"xolacer_profiles"> | null,
  openCount: number,
): profile is Doc<"xolacer_profiles"> {
  return Boolean(
    profile &&
      profile.complete &&
      profile.active &&
      !isAtOpenCap(openCount, MAX_OPEN_CONVERSATIONS),
  );
}

async function getXolacerProfileByProfileId(
  ctx: QueryCtx,
  emotionalProfileId: Id<"emotional_profiles">,
) {
  return await ctx.db
    .query("xolacer_profiles")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", emotionalProfileId))
    .unique();
}

async function findRating(
  ctx: QueryCtx,
  conversationId: Id<"xolacer_conversations">,
) {
  return await ctx.db
    .query("conversation_ratings")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .unique();
}

async function requireConversationParticipant(
  ctx: QueryCtx,
  conversationId: Id<"xolacer_conversations">,
) {
  const { user, profile } = await requireAuth(ctx);
  const conversation = await ctx.db.get("xolacer_conversations", conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const role =
    conversation.userProfileId === profile._id
      ? ("user" as const)
      : conversation.xolacerProfileId === profile._id
        ? ("xolacer" as const)
        : null;
  if (!role) throw new Error("Conversation does not belong to this user");
  return { user, profile, conversation, role };
}

// ============================================================
// Status / gating
// ============================================================

/** Feature + role status for the Connect tab. Null-safe when disabled. */
export const status = query({
  args: {},
  returns: v.union(
    v.object({ enabled: v.literal(false) }),
    v.object({
      enabled: v.literal(true),
      isXolacer: v.boolean(),
      xolacerProfileComplete: v.boolean(),
      xolacerActive: v.boolean(),
      // Same value Stream connects as (see getConversation's myStreamUserId).
      // Additive: lets a caller match this profile against a Stream-sourced
      // roster without a second round trip.
      myProfileId: v.id("emotional_profiles"),
    }),
  ),
  handler: async (ctx) => {
    if (!chatEnabled()) return { enabled: false as const };
    const { user, profile } = await requireAuth(ctx);
    const xolacerProfile = user.isXolacer
      ? await getXolacerProfileByProfileId(ctx, profile._id)
      : null;
    return {
      enabled: true as const,
      isXolacer: Boolean(user.isXolacer),
      xolacerProfileComplete: Boolean(xolacerProfile?.complete),
      xolacerActive: Boolean(xolacerProfile?.active),
      myProfileId: profile._id,
    };
  },
});

// ============================================================
// Directory
// ============================================================

export const directory = query({
  args: {},
  returns: v.array(
    v.object({
      xolacerProfileId: v.id("emotional_profiles"),
      displayName: v.string(),
      bio: v.string(),
      photoUrl: v.optional(v.string()),
      specialties: v.array(specialtyValidator),
      rating: v.optional(v.number()),
      ratingCount: v.number(),
      atCapacity: v.boolean(),
      xolacerSince: v.number(),
      /** In the app right now. The roster sorts on it; it never filters. */
      present: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    if (!chatEnabled()) return [];
    const { profile } = await requireAuth(ctx);

    // One room read for the whole query — cheaper than the per-xolacer open
    // count below, which this loop already pays per row.
    //
    // ponytail: the cost is in the read set, not the read. This puts the whole
    // online index range in scope, so *any* user going online or offline —
    // overwhelmingly seekers, who can never change this query's output —
    // re-runs the entire directory for every subscribed client, at ~50
    // xolacers x (loadPairBlocked + countOpen). That is O(N^2) recomputation
    // in concurrent users. Fine at single-digit xolacers; if it bites, swap
    // presentProfileIds for a per-candidate presence.listUser read, which
    // narrows the read set to the xolacers actually rendered.
    const present = await presentProfileIds(ctx);

    const xolacers = await ctx.db
      .query("xolacer_profiles")
      .withIndex("by_complete_and_active", (q) =>
        q.eq("complete", true).eq("active", true),
      )
      .take(50);

    const rows = [];
    for (const xolacer of xolacers) {
      // A xolacer browsing the roster shouldn't see themselves.
      if (xolacer.emotionalProfileId === profile._id) continue;
      // Blocking hides, it doesn't just refuse
      if (await loadPairBlocked(ctx, profile._id, xolacer.emotionalProfileId)) {
        continue;
      }
      const openCount = await countOpen(ctx, xolacer.emotionalProfileId);
      rows.push({
        xolacerProfileId: xolacer.emotionalProfileId,
        displayName: xolacer.displayName ?? "",
        bio: xolacer.bio ?? "",
        photoUrl: xolacer.photoUrl,
        specialties: xolacer.specialties ?? [],
        ...publicRating(xolacer),
        atCapacity: isAtOpenCap(openCount, MAX_OPEN_CONVERSATIONS),
        xolacerSince: xolacer.createdAt,
        present: present.has(xolacer.emotionalProfileId),
      });
    }
    return rows;
  },
});

/** Public profile + my relationship to this xolacer (drives the CTA). */
export const xolacerProfile = query({
  args: { xolacerProfileId: v.id("emotional_profiles") },
  returns: v.union(
    v.null(),
    v.object({
      xolacerProfileId: v.id("emotional_profiles"),
      displayName: v.string(),
      bio: v.string(),
      photoUrl: v.optional(v.string()),
      specialties: v.array(specialtyValidator),
      rating: v.optional(v.number()),
      ratingCount: v.number(),
      xolacerSince: v.number(),
      available: v.boolean(),
      /** In the app right now — the same signal the roster's dot reads. */
      present: v.boolean(),
      /** Viewing your own profile — the request CTA is replaced, not disabled. */
      isSelf: v.boolean(),
      /**
       * May the viewer rate this xolacer right now — the profile's rate card
       * is the primary place to do it, so this is answered here rather than
       * costing the screen a second round-trip into `getConversation`.
       * Always false on your own profile.
       */
      canRate: v.boolean(),
      /** The score the viewer already gave, if any. */
      myRating: v.optional(v.number()),
      conversation: v.union(
        v.null(),
        v.object({
          id: v.id("xolacer_conversations"),
          status: statusValidator,
          closedReason: closedReasonValidator,
          // Present only while a decline is still resting. The CTA reads it so
          // the wait is on screen before anyone writes anything — finding out
          // on submit is the version of this that reads as a second refusal.
          retryAvailableAt: v.optional(v.number()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    if (!chatEnabled()) return null;
    const { profile } = await requireAuth(ctx);

    const xolacer = await getXolacerProfileByProfileId(ctx, args.xolacerProfileId);
    if (!xolacer || !xolacer.complete) return null;

    // Same as the directory, for the path that skips it: a deep link, or a
    // row still cached on the client. Null renders "unavailable", not a
    // dead-end request CTA.
    if (
      profile._id !== args.xolacerProfileId &&
      (await loadPairBlocked(ctx, profile._id, args.xolacerProfileId))
    ) {
      return null;
    }

    const openCount = await countOpen(ctx, args.xolacerProfileId);
    const conversation = await ctx.db
      .query("xolacer_conversations")
      .withIndex("by_user_and_xolacer", (q) =>
        q.eq("userProfileId", profile._id).eq("xolacerProfileId", args.xolacerProfileId),
      )
      .unique();
    const isSelf = profile._id === args.xolacerProfileId;
    // Through the accessor, like every other surface — this screen never reads
    // the presence component itself.
    //
    // `active` is the gate, not `presenceDisclosed`: this is a public directory
    // profile, so "here now" is the same fact the roster already shows to
    // anyone — but only for someone the roster would show at all. `directory`
    // filters on the complete-and-active index, and without the same check
    // here a xolacer who switched "You're listed" off precisely to stop being
    // reachable is still watchable, live, by any seeker holding a deep link or
    // a cached row. The heartbeat is deliberately not gated on `active`
    // (see convex/presence.ts), so the visibility gate has to be here.
    //
    // And never about yourself: `present` is trivially true when you are the
    // one looking, and a dot on the screen a xolacer uses to check how they
    // appear to seekers reads as a bug.
    const present =
      xolacer.active && !isSelf
        ? (await presentProfileIds(ctx)).has(args.xolacerProfileId)
        : false;

    const myRating =
      !isSelf && conversation ? await findRating(ctx, conversation._id) : null;

    return {
      xolacerProfileId: args.xolacerProfileId,
      displayName: xolacer.displayName ?? "",
      bio: xolacer.bio ?? "",
      photoUrl: xolacer.photoUrl,
      specialties: xolacer.specialties ?? [],
      ...publicRating(xolacer),
      xolacerSince: xolacer.createdAt,
      present,
      available: xolacerAvailable(xolacer, openCount),
      isSelf,
      // The row found here is always the viewer-as-seeker direction (the index
      // is keyed userProfileId → xolacerProfileId), so "user" is the viewer's
      // role on it by construction.
      canRate: !isSelf && conversation ? canRate(conversation, "user") : false,
      myRating: myRating?.rating,
      conversation: conversation
        ? {
            id: conversation._id,
            status: conversation.status,
            closedReason: conversation.closedReason,
            retryAvailableAt: declineCooldownUntil(conversation, Date.now()),
          }
        : null,
    };
  },
});

export const suggestionValidator = v.object({
  xolacerProfileId: v.id("emotional_profiles"),
  displayName: v.string(),
  photoUrl: v.optional(v.string()),
  specialties: v.array(specialtyValidator),
  specialty: specialtyValidator,
  rating: v.optional(v.number()),
  ratingCount: v.number(),
});

/**
 * Every xolacer this session may be offered, in the ranker's order, or null
 * when the session offers no one. The single owner of suggestion eligibility:
 * the deprecated query takes the head, the meaning ranker (#570) reorders the
 * list. Reads only — nothing here records who was offered.
 */
async function eligibleSuggestions(ctx: QueryCtx, sessionId: Id<"sessions">) {
  if (!chatEnabled()) return null;

  // Null, never throw, when the session isn't this user's or is gone. The
  // caller is the session-end close phase, which reads `sessionId` from a
  // route param and renders inside no error boundary — a throw there takes
  // the whole screen down.
  const { profile } = await requireAuth(ctx);
  const session = await ctx.db.get("sessions", sessionId);
  if (!session || session.emotionalProfileId !== profile._id) return null;


  const metadata = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .unique();
  const specialty = metadata?.suggestedSpecialty;
  if (!specialty) return null;

  // The stored verdict only ever saw the first input. Refinement turns are
  // deliberately not re-classified (ai/clarify.ts: "Skips moderation +
  // classification"), so anything the user added afterwards has been through
  // no safeguard and no classifier — and the specialty above predates it.
  // Suggesting on it would route someone to a volunteer on the strength of a
  // verdict that never read what they last said.
  // Bounded by design: a session has at most MAX_TURNS (2) refinement turns.
  const turns = await ctx.db
    .query("session_turns")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .take(4);
  if (turns.some((turn) => turn.userInput)) return null;

  // `specialties` is an array field, so it can't be indexed — the specialty
  // filter has to run in memory, which means the scan feeding it must not be
  // truncated first. A prefix would silently hide declaring xolacers the
  // moment the roster outgrew it, and the failure looks like "no suggestion"
  // rather than an error. Bounded in practice by roster size: this is the
  // directory, a curated set.
  // ponytail: full active-roster scan; needs a denormalized
  // specialty->xolacer index if the roster reaches the low thousands.
  const declaring: Doc<"xolacer_profiles">[] = [];
  for await (const xolacer of ctx.db
    .query("xolacer_profiles")
    .withIndex("by_complete_and_active", (q) =>
      q.eq("complete", true).eq("active", true),
    )) {
    if (xolacer.emotionalProfileId === profile._id) continue;
    if (!xolacer.specialties?.includes(specialty)) continue;
    if (!meetsRatingFloor(xolacer)) continue;
    declaring.push(xolacer);
    if (declaring.length >= MAX_SUGGESTION_CANDIDATES) break;
  }

  // One room read for the whole candidate set — see presentProfileIds.
  const present = await presentProfileIds(ctx);

  const candidates = [];
  for (const xolacer of declaring) {
    // Exact pair lookup, not a scan of this user's rows: a past decline or
    // an expired request must not come back dressed as a fresh
    // recommendation, and a capped scan would eventually miss one. This is
    // what by_user_and_xolacer exists for.
    const { forward, reverse } = await loadPairRows(
      ctx,
      profile._id,
      xolacer.emotionalProfileId,
    );
    if (forward) continue;

    if (isPairBlocked(forward, reverse)) continue;
    const openCount = await countOpen(ctx, xolacer.emotionalProfileId);
    if (!xolacerAvailable(xolacer, openCount)) continue;
    candidates.push({
      xolacerProfileId: xolacer.emotionalProfileId,
      openCount,
      present: present.has(xolacer.emotionalProfileId),
      xolacer,
    });
  }

  return {
    emotionalProfileId: profile._id,
    rawInput: session.rawInput,
    candidates: rankSuggestionCandidates(candidates, sessionId).map((c) => ({
      xolacerProfileId: c.xolacerProfileId,
      displayName: c.xolacer.displayName ?? "Xolacer",
      photoUrl: c.xolacer.photoUrl,
      specialties: c.xolacer.specialties ?? [],
      specialty,
      ...publicRating(c.xolacer),
    })),
  };
}

/**
 * The one xolacer this session would offer, or null — null being the correct
 * and common answer.
 *
 * The person is chosen at read time and never stored. That is load-bearing for
 * privacy, not an optimization: no record linking a session to a specific
 * xolacer exists anywhere, which is what keeps the profile screen's promise
 * that a chat is never linked to a user's reflections literally true. It also
 * means availability is always current, so there is no stale suggestion to
 * expire.
 *
 * @deprecated Ranks without meaning; current clients call the read-time action
 * `ai/xolacers/suggest:sessionSuggestion` (#570).
 */
// DEPRECATED(remove-after: app >= 1.16.0): pre-#570 clients read this; the action replaces it.
export const sessionSuggestion = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(v.null(), suggestionValidator),
  handler: async (ctx, args) => {
    return (await eligibleSuggestions(ctx, args.sessionId))?.candidates[0] ?? null;
  },
});

/** The meaning ranker's input (#570): the eligible list plus the text to embed. */
export const suggestionCandidates = internalQuery({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.null(),
    v.object({
      emotionalProfileId: v.id("emotional_profiles"),
      rawInput: v.optional(v.string()),
      candidates: v.array(suggestionValidator),
    }),
  ),
  handler: async (ctx, args) => {
    return await eligibleSuggestions(ctx, args.sessionId);
  },
});

// ============================================================
// Conversations
// ============================================================

export const myConversations = query({
  args: {},
  returns: v.array(conversationRowValidator),
  handler: async (ctx) => {
    const { user, profile } = await requireAuth(ctx);

    // The kill switch gates only the ambassador pair rows — the Xolace
    // broadcast row below is always-on (CONTEXT.md, "The Xolace channel").
    const pairsEnabled = chatEnabled();
    const asUser = pairsEnabled
      ? await ctx.db
          .query("xolacer_conversations")
          .withIndex("by_user_and_status", (q) =>
            q.eq("userProfileId", profile._id),
          )
          .take(100)
      : [];

    const asXolacer = pairsEnabled && user.isXolacer
      ? await ctx.db
          .query("xolacer_conversations")
          .withIndex("by_xolacer_and_status", (q) =>
            q.eq("xolacerProfileId", profile._id),
          )
          .take(100)
      : [];

    // One room read for both lists — the whole point of the accessor being a
    // room read rather than a per-user one.
    //
    // Skipped entirely when no row could show presence anyway. The read puts
    // the whole online index range in this query's read set, and this query is
    // subscribed for as long as the Connect tab is mounted, which is the app's
    // lifetime: without the guard, a user whose conversations are all resting
    // or closed re-runs their entire list — `catalogAvatar` per row included —
    // every time anyone, anywhere, opens or closes the app.
    const anyDisclosed = [...asUser, ...asXolacer].some((conversation) =>
      presenceDisclosed(conversation.status),
    );
    const present = anyDisclosed ? await presentProfileIds(ctx) : null;
    const counterpartPresent = (
      conversation: Doc<"xolacer_conversations">,
      counterpartProfileId: Id<"emotional_profiles">,
    ) =>
      presenceDisclosed(conversation.status) &&
      (present?.has(counterpartProfileId) ?? false);

    // Blocked rows leave both lists, not just the blocker's — a permanent
    // "stepped back" row the blocked party can keep tapping is more pointed
    // than the conversation simply no longer appearing. Nothing is deleted:
    // the row stays reachable by direct id for moderation.
    const rows = [];
    for (const conversation of asUser) {
      if (isBlocked(conversation.closedReason)) continue;
      // Deleted by this viewer: gone from every view, Archived included, no
      // matter what the other party has done with their copy.
      if (conversation.deletedByUser) continue;
      const xolacer = await getXolacerProfileByProfileId(
        ctx,
        conversation.xolacerProfileId,
      );
      rows.push({
        kind: "pair" as const,
        id: conversation._id,
        role: "user" as const,
        status: conversation.status,
        closedReason: conversation.closedReason,
        streamChannelId: conversation.streamChannelId,
        lastMessageAt: conversation.lastMessageAt,
        requestedAt: conversation.requestedAt,
        xolacerProfileId: conversation.xolacerProfileId,
        counterpartProfileId: conversation.xolacerProfileId,
        counterpartName: xolacer?.displayName ?? "Xolacer",
        counterpartPhotoUrl: xolacer?.photoUrl,
        counterpartPresent: counterpartPresent(
          conversation,
          conversation.xolacerProfileId,
        ),
        restingReason: conversation.restingReason,
        archived: isArchivedFor(conversation, "user"),
      });
    }
    for (const conversation of asXolacer) {
      if (isBlocked(conversation.closedReason)) continue;
      if (conversation.deletedByXolacer) continue;
      rows.push({
        kind: "pair" as const,
        id: conversation._id,
        role: "xolacer" as const,
        status: conversation.status,
        closedReason: conversation.closedReason,
        streamChannelId: conversation.streamChannelId,
        lastMessageAt: conversation.lastMessageAt,
        requestedAt: conversation.requestedAt,
        xolacerProfileId: conversation.xolacerProfileId,
        counterpartProfileId: conversation.userProfileId,
        counterpartName: camperNameOf(conversation),
        counterpartPhotoUrl: await catalogAvatar(ctx, conversation.userProfileId),
        counterpartPresent: counterpartPresent(
          conversation,
          conversation.userProfileId,
        ),
        origin: conversation.origin,
        restingReason: conversation.restingReason,
        archived: isArchivedFor(conversation, "xolacer"),
      });
    }

    // Every member's row (CONTEXT.md, "The Xolace channel") — no membership
    // check needed, membership is universal by construction (#374). Sourced
    // from #376's cache; absent until the channel's first message.
    const xolaceCache = await ctx.db.query("xolace_channel_cache").first();
    rows.push({
      kind: "broadcast" as const,
      id: XOLACE_CHANNEL_ID,
      streamChannelId: XOLACE_CHANNEL_ID,
      channelType: XOLACE_BROADCAST_CHANNEL_TYPE,
      lastMessageAt: xolaceCache?.sentAt,
      lastMessageText: xolaceCache?.text,
    });

    // Requested first (xolacer inbox), then most recent activity. No special
    // case for the broadcast row — it sorts by the same key as everything
    // else (CONTEXT.md: "no permanent pin").
    rows.sort((a, b) => {
      const aKey = a.lastMessageAt ?? (a.kind === "pair" ? a.requestedAt : 0);
      const bKey = b.lastMessageAt ?? (b.kind === "pair" ? b.requestedAt : 0);
      return bKey - aKey;
    });
    return rows;
  },
});

export const getConversation = query({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("xolacer_conversations"),
      role: v.union(v.literal("user"), v.literal("xolacer")),
      status: statusValidator,
      closedReason: closedReasonValidator,
      streamChannelId: v.optional(v.string()),
      lastMessageAt: v.optional(v.number()),
      requestedAt: v.number(),
      resumable: v.boolean(),
      restingReason: restingReasonValidator,
      canRate: v.boolean(),
      myRating: v.optional(v.number()),
      counterpartProfileId: v.id("emotional_profiles"),
      counterpartName: v.string(),
      counterpartPhotoUrl: v.optional(v.string()),
      /**
       * Same field, same source, same rule as the list — so a thread seeded
       * from a conversation row and one loaded cold agree. Read only by the
       * status bar, which is the pending-request surface: once a channel
       * exists the header is an open thread, and Stream owns presence there.
       */
      counterpartPresent: v.boolean(),
      myStreamUserId: v.id("emotional_profiles"),
      origin: originValidator,
    }),
  ),
  handler: async (ctx, args) => {
    if (!chatEnabled()) return null;
    const { profile, conversation, role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );

    const xolacer = await getXolacerProfileByProfileId(
      ctx,
      conversation.xolacerProfileId,
    );
    const openCount = await countOpen(ctx, conversation.xolacerProfileId);
    // Resting → Open without a fresh request only while the xolacer is
    // still published, active, and under cap.
    const resumable = xolacerAvailable(xolacer, openCount);

    const existingRating =
      role === "user" ? await findRating(ctx, conversation._id) : null;

    const counterpartProfileId =
      role === "user" ? conversation.xolacerProfileId : conversation.userProfileId;
    // Narrower than `presenceDisclosed`, and deliberately so: a request is the
    // only state this query's presence is ever rendered in. `ThreadStatusBar`
    // is the sole consumer, and once the row is `open` the screen shows a
    // composer instead of the bar — so paying for presence there would put the
    // whole online index range into the read set of the feature's hottest
    // query, re-running it (with `catalogAvatar`, `findRating`, `countOpen`)
    // for every client sitting in a live thread each time anyone anywhere
    // opens or closes the app, to compute a value nothing renders.
    //
    // That makes this field disagree with the identically-named one on
    // `myConversations`, which does answer for `open` rows because the chats
    // list draws a dot on them. `useThreadConversation` seeds from that list,
    // so an open thread can hold `true` for one frame and then read `false` —
    // invisible, because neither value is rendered in that state, and the
    // privacy rule (`presenceDisclosed`) is the same on both sides. If the
    // thread ever grows an open-state presence indicator, this reverts to
    // `presenceDisclosed` and the read-set cost comes with it.
    const counterpartPresent =
      conversation.status === "requested" &&
      (await presentProfileIds(ctx)).has(counterpartProfileId);

    return {
      id: conversation._id,
      role,
      status: conversation.status,
      closedReason: conversation.closedReason,
      streamChannelId: conversation.streamChannelId,
      lastMessageAt: conversation.lastMessageAt,
      requestedAt: conversation.requestedAt,
      resumable,
      restingReason: conversation.restingReason,
      canRate: canRate(conversation, role),
      myRating: existingRating?.rating,
      counterpartProfileId,
      counterpartPresent,
      counterpartName:
        role === "user"
          ? (xolacer?.displayName ?? "Xolacer")
          : camperNameOf(conversation),
      counterpartPhotoUrl:
        role === "user"
          ? xolacer?.photoUrl
          : await catalogAvatar(ctx, conversation.userProfileId),
      myStreamUserId: profile._id,
      // Returned to both roles, matching myConversations: origin is the
      // seeker's own data, so it leaks nothing back to them, and one field
      // beats two code paths that can drift. Role-gating lives in the badge,
      // which renders on xolacer-role rows only.
      origin: conversation.origin,
    };
  },
});

/**
 * Structural only: that a request was sent, and how fresh the sender was.
 * No specialty, no theme, no session content — that would put the classifier's
 * read of a person into analytics before the person has said a word.
 */
async function captureRequestSent(
  ctx: MutationCtx,
  distinctId: Id<"emotional_profiles">,
  origin: ConversationOrigin,
) {
  // Swallowed on purpose: this runs inside the request mutation's transaction,
  // so a throw here would roll back the request the user just sent. Losing one
  // analytics event beats losing the request.
  try {
    await posthog.capture(ctx, {
      distinctId,
      event: "xolacer_request_sent",
      properties: { origin },
    });
  } catch (error) {
    console.error("xolacer_request_sent capture failed", error);
  }
}

/**
 * Tell someone the other person is waiting on them, or has answered.
 *
 * Scheduled, not called: a push failure must not roll back the lifecycle change
 * that earned it. Fires only where the row actually moved — never on the
 * idempotent request early-return, and never on block, resume, or a xolacer
 * leaving, which are closures to find in the app rather than push at someone.
 * Expiry is the exception among closures: nobody acted, so without a push the
 * seeker is left waiting on an answer that already stopped coming.
 *
 * `counterpartName` is whatever the recipient already calls that person on
 * every other surface — a pseudonym looking at a seeker, the public display
 * name looking at a xolacer. It is omitted for a decline and an expiry: those
 * notifications name nobody, so nobody's name is sent.
 */
async function notifyConversation(
  ctx: MutationCtx,
  type: ChatNotificationType,
  conversationId: Id<"xolacer_conversations">,
  recipientProfileId: Id<"emotional_profiles">,
  counterpartName?: string,
) {
  await ctx.scheduler.runAfter(0, internal.chatNotifications.send, {
    emotionalProfileId: recipientProfileId,
    type,
    counterpartName,
    conversationId,
  });
}

/**
 * Origin, derived server-side from recency. No session id reaches this
 * mutation and none is stored — the specialty on the Understanding is the
 * only thing read, so no session→conversation link exists at any point.
 */
async function deriveOrigin(
  ctx: QueryCtx,
  userProfileId: Id<"emotional_profiles">,
  xolacer: Doc<"xolacer_profiles">,
) {
  // Streamed rather than collected: one row is enough to answer "suggestion",
  // so a match stops the scan. Only the "direct" answer walks the whole
  // window, and that is one row per session for one user over 24 hours.
  const since = Date.now() - SUGGESTION_ORIGIN_WINDOW_MS;
  for await (const row of ctx.db
    .query("emotional_metadata")
    .withIndex("by_profile_createdAt", (q) =>
      q.eq("emotionalProfileId", userProfileId).gte("createdAt", since),
    )) {
    const suggested = row.suggestedSpecialty;
    if (!suggested) continue;
    if (conversationOrigin([suggested], xolacer.specialties) === "suggestion") {
      return "suggestion";
    }
  }
  return "direct";
}

export const requestConversation = mutation({
  args: { xolacerProfileId: v.id("emotional_profiles") },
  returns: v.id("xolacer_conversations"),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { profile } = await requireAuth(ctx);
    if (profile._id === args.xolacerProfileId) {
      throw new Error("Cannot request a conversation with yourself");
    }

    const xolacer = await getXolacerProfileByProfileId(ctx, args.xolacerProfileId);
    const openCount = await countOpen(ctx, args.xolacerProfileId);
    if (!xolacerAvailable(xolacer, openCount)) {
      throw new Error("This xolacer is not taking conversations right now");
    }

    // `reverse` is the row where these two hold the opposite roles. A block
    // filed there is the same block: without reading it, whoever was blocked
    // could still open a fresh conversation simply by being the one who asks.
    const { forward: existing, reverse } = await loadPairRows(
      ctx,
      profile._id,
      args.xolacerProfileId,
    );

    if (existing) {
      // One conversation per pair, ever. Re-requesting reopens the same row.
      //
      // Ahead of both new gates on purpose. The open cap, because this
      // conversation is already one of the ones counted against it. The pair
      // block, because a pair that was independently reachable before this
      // shipped is grandfathered — throwing here would close a live thread
      // whose "Open chat" worked yesterday.
      if (existing.status === "requested" || existing.status === "open") {
        return existing._id;
      }
    }

    if (isPairBlocked(existing, reverse)) {
      throw new Error("This conversation can no longer be reopened");
    }

    if (existing) {
      if (existing.status === "resting") {
        // Profile CTA says "Open chat" here; a request is just a resume — and
        // a resume takes an open slot, so it answers to the same cap.
        await requireOpenSlot(ctx, "seeker", profile._id);
        await ctx.db.patch("xolacer_conversations", existing._id, {
          status: "open",
          restingReason: undefined,
        });
        return existing._id;
      }
      // Closed: declined/expired may re-request; xolacer_left may not.
      // (`blocked` was already refused above, in either direction.)
      if (existing.closedReason === "xolacer_left") {
        throw new Error("This conversation can no longer be reopened");
      }
      // A decline is not a door that reopens on the next tap. Ahead of the caps
      // and of every write below, so a re-request inside the window moves no
      // row and fires no `chat_request` — the whole point is that the xolacer's
      // phone stays quiet. The client already shows this on the profile before
      // anyone taps; reaching it means a stale screen, so the error carries the
      // date the same sentence needs.
      const retryAt = declineCooldownUntil(existing, Date.now());
      if (retryAt !== undefined) {
        throw new ConvexError({ code: "decline_cooldown", until: retryAt });
      }
      await requireOpenSlot(ctx, "seeker", profile._id);
      await requirePendingRequestSlot(ctx, profile._id);
      // Overwritten, never merged: a re-request from the roster months later
      // must badge as direct.
      const origin = await deriveOrigin(ctx, profile._id, xolacer);
      await ctx.db.patch("xolacer_conversations", existing._id, {
        status: "requested",
        closedReason: undefined,
        requestedAt: Date.now(),
        origin,
        // One side may have deleted their copy of the declined row. A
        // re-request is a live request again, and a xolacer who never sees it
        // because they cleared the last one is the worst version of this.
        deletedByUser: undefined,
        deletedByXolacer: undefined,
      });
      await captureRequestSent(ctx, profile._id, origin);
      await notifyConversation(
        ctx,
        "chat_request",
        existing._id,
        args.xolacerProfileId,
        await ensureCamperName(ctx, existing),
      );
      return existing._id;
    }

    await requireOpenSlot(ctx, "seeker", profile._id);
    await requirePendingRequestSlot(ctx, profile._id);
    const origin = await deriveOrigin(ctx, profile._id, xolacer);
    // Drawn once, here, and never again for this pair: this is the name this
    // one xolacer knows this one seeker by, for as long as the row lives.
    const camperTag = generateCamperTag(
      await takenCamperTags(ctx, args.xolacerProfileId),
    );
    const conversationId = await ctx.db.insert("xolacer_conversations", {
      userProfileId: profile._id,
      xolacerProfileId: args.xolacerProfileId,
      status: "requested",
      requestedAt: Date.now(),
      origin,
      camperTag,
    });
    await captureRequestSent(ctx, profile._id, origin);
    await notifyConversation(
      ctx,
      "chat_request",
      conversationId,
      args.xolacerProfileId,
      camperName(camperTag),
    );
    return conversationId;
  },
});

/** Xolacer-side validation for accept — runs in query ctx so the action stays thin. */
export const getForAccept = internalQuery({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.object({
    userProfileId: v.id("emotional_profiles"),
    xolacerProfileId: v.id("emotional_profiles"),
    xolacerImage: v.optional(v.string()),
    userImage: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { conversation, role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    if (role !== "xolacer") throw new Error("Only the xolacer can accept");
    if (conversation.status !== "requested") {
      throw new Error("Request is no longer pending");
    }
    // Both caps, before any Stream call. The xolacer's was never re-checked
    // here at all: requests that arrived while they had room could be accepted
    // long after they hit 8, which is how someone ended up holding more than
    // the cap allows. `markAccepted` re-checks transactionally; this pass is
    // what stops a doomed accept from creating a channel first.
    await requireOpenSlot(ctx, "xolacer", conversation.xolacerProfileId);
    await requireOpenSlot(ctx, "seeker", conversation.userProfileId);
    return {
      userProfileId: conversation.userProfileId,
      xolacerProfileId: conversation.xolacerProfileId,
      xolacerImage: await catalogAvatar(ctx, conversation.xolacerProfileId),
      userImage: await catalogAvatar(ctx, conversation.userProfileId),
    };
  },
});

/**
 * Latency plus whether the xolacer — the request's recipient, now accepting
 * it — was present in-app at accept time. Both notifications and presence
 * ship in this same release, so this is the only way to separate their
 * effects afterwards: an absent accepter was reached by the push, a present
 * one already had the app open regardless of it.
 */
async function captureRequestAccepted(
  ctx: MutationCtx,
  conversation: Doc<"xolacer_conversations">,
) {
  // Swallowed on purpose, same as captureRequestSent: this runs inside the
  // accept transaction, so a throw here must not roll back the accept.
  try {
    const recipientPresent = (await presentProfileIds(ctx)).has(
      conversation.xolacerProfileId,
    );
    await posthog.capture(ctx, {
      distinctId: conversation.xolacerProfileId,
      event: "xolacer_request_accepted",
      properties: {
        latencyMs: Date.now() - conversation.requestedAt,
        recipientPresent,
      },
    });
  } catch (error) {
    console.error("xolacer_request_accepted capture failed", error);
  }
}

export const markAccepted = internalMutation({
  args: {
    conversationId: v.id("xolacer_conversations"),
    streamChannelId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get("xolacer_conversations", args.conversationId);
    if (!conversation || conversation.status !== "requested") return;
    // The transactional guard. Between `getForAccept` and here sits a Stream
    // round trip, and either party can have filled their last slot in another
    // conversation during it. Throwing leaves the row `requested` — the 7-day
    // expiry sweep already cleans it up if nobody ever frees a slot, so no new
    // lifecycle state is needed.
    await requireOpenSlot(ctx, "xolacer", conversation.xolacerProfileId);
    await requireOpenSlot(ctx, "seeker", conversation.userProfileId);
    await ctx.db.patch("xolacer_conversations", args.conversationId, {
      status: "open",
      streamChannelId: args.streamChannelId,
      acceptedAt: Date.now(),
      lastMessageAt: Date.now(),
    });
    await captureRequestAccepted(ctx, conversation);
    // Here rather than in the surrounding action, so the seeker is only told
    // the conversation is open once the cap re-check above has let it open.
    //
    // The seeker knows this xolacer by their public display name — the same
    // one their chats list and the profile they requested from both show. A
    // pseudonym would name someone they have never met.
    const xolacer = await getXolacerProfileByProfileId(
      ctx,
      conversation.xolacerProfileId,
    );
    await notifyConversation(
      ctx,
      "chat_accepted",
      args.conversationId,
      conversation.userProfileId,
      xolacer?.displayName ?? "Xolacer",
    );
  },
});

/**
 * Accept a request: create the Stream channel (network I/O → action), then
 * flip the row to open. Channel id is deterministic per conversation, so a
 * retry after a partial failure is idempotent.
 *
 * Known and deliberately unfixed: the Stream round trip sits between the
 * pre-flight cap check in `getForAccept` and the transactional re-check in
 * `markAccepted`, so an accept that loses that race leaves an orphaned channel
 * in Stream. It is unreachable through the product — the client can only reach
 * a channel via the id stored on the row — the deterministic id means a retry
 * reuses it, and channels are not metered. Every fix adds a network call and a
 * new failure path to defend against a stray empty channel in Stream's
 * database.
 */
export const acceptRequest = action({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const info: {
      userProfileId: Id<"emotional_profiles">;
      xolacerProfileId: Id<"emotional_profiles">;
      xolacerImage?: string;
      userImage?: string;
    } = await ctx.runQuery(internal.xolacerChat.getForAccept, {
      conversationId: args.conversationId,
    });

    const channelId = xolacerChannelId(args.conversationId);
    await upsertStreamUsers([
      {
        id: info.xolacerProfileId,
        name: GENERIC_CAMPER_NAME,
        image: info.xolacerImage,
      },
      {
        id: info.userProfileId,
        name: GENERIC_CAMPER_NAME,
        image: info.userImage,
      },
    ]);
    await createXolacerChannel(
      channelId,
      [info.xolacerProfileId, info.userProfileId],
      info.xolacerProfileId,
    );

    await ctx.runMutation(internal.xolacerChat.markAccepted, {
      conversationId: args.conversationId,
      streamChannelId: channelId,
    });
    return null;
  },
});

export const declineRequest = mutation({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { conversation, role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    if (role !== "xolacer") throw new Error("Only the xolacer can decline");
    if (conversation.status !== "requested") return null;
    await ctx.db.patch("xolacer_conversations", args.conversationId, {
      status: "closed",
      closedReason: "declined",
      declinedAt: Date.now(),
    });
    await notifyConversation(
      ctx,
      "chat_declined",
      args.conversationId,
      conversation.userProfileId,
    );
    return null;
  },
});

/**
 * Wrap an open conversation up early — the same `resting` transition the quiet
 * sweep reaches on its own, taken deliberately. Nothing new is locked down:
 * the seeker can still read and send exactly as on a swept row, and either
 * side can pick it back up through `resumeConversation`.
 *
 * `restingReason` is the only difference, and it exists for copy: an
 * intentional wrap-up shouldn't read as someone having gone quiet on you.
 */
export const restConversation = mutation({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { conversation, role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    if (!canManualRest(conversation, role)) {
      throw new Error("This conversation can't be closed");
    }
    await ctx.db.patch("xolacer_conversations", args.conversationId, {
      status: "resting",
      restingReason: "manual",
    });
    return null;
  },
});

/**
 * Hide this row from my own list. Either role, any status: archive is a
 * viewer-side preference, not a lifecycle transition, so there is nothing
 * about the conversation itself for it to be gated on.
 *
 * Stamping a time rather than setting a flag is what lets `isArchivedFor`
 * un-hide the row when anything happens on it afterwards — nobody has to
 * remember to clear this.
 */
export const archiveConversation = mutation({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    const now = Date.now();
    await ctx.db.patch(
      "xolacer_conversations", args.conversationId,
      role === "user" ? { archivedByUserAt: now } : { archivedByXolacerAt: now },
    );
    return null;
  },
});

/** The undo, from the Archived view. Clears only this viewer's stamp. */
export const unarchiveConversation = mutation({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    await ctx.db.patch(
      "xolacer_conversations", args.conversationId,
      role === "user"
        ? { archivedByUserAt: undefined }
        : { archivedByXolacerAt: undefined },
    );
    return null;
  },
});

/**
 * Remove this row from my own list for good — the one action archive isn't,
 * and only ever on a request that was declined or expired (`canDelete`).
 *
 * Per-side, like archive: setting my flag never touches what the other party
 * sees. Once both flags are set nobody is left who could read the row, so it
 * is purged here rather than by a sweep — a row that can only be reached by
 * two people, both of whom said "gone", has nothing to wait for.
 */
export const deleteConversation = mutation({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { conversation, role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    if (!canDelete(conversation)) {
      throw new Error("This conversation can't be deleted");
    }
    const mine =
      role === "user" ? { deletedByUser: true } : { deletedByXolacer: true };
    if (bothPartiesDeleted({ ...conversation, ...mine })) {
      // `canDelete` rows never carried messages, so one verdict batch covers it.
      await purgeModerationEvents(ctx, args.conversationId);
      await ctx.db.delete("xolacer_conversations", args.conversationId);
      return null;
    }
    await ctx.db.patch("xolacer_conversations", args.conversationId, mine);
    return null;
  },
});

/**
 * Participant guard + block plan in query ctx, so the action stays thin.
 * Deliberately no role check: both roles may block. A xolacer's only exit
 * today (`declineRequest`) stops working the moment they accept.
 *
 * Planned over both rows the pair can hold, never the one the block was filed
 * on: a pair with a second open row would otherwise keep messaging through it.
 */
export const getForBlock = internalQuery({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.object({
    noop: v.boolean(),
    channelsToFreeze: v.array(v.string()),
    rowsToClose: v.array(v.id("xolacer_conversations")),
  }),
  handler: async (ctx, args) => {
    const { conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    return planBlock(
      await loadPairRows(
        ctx,
        conversation.userProfileId,
        conversation.xolacerProfileId,
      ),
    );
  },
});

export const markBlocked = internalMutation({
  args: { conversationIds: v.array(v.id("xolacer_conversations")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const conversationId of args.conversationIds) {
      const conversation = await ctx.db.get("xolacer_conversations", conversationId);
      // Re-checked here, not just in the plan: the freeze is a network round
      // trip, so the row can have been blocked in between. Any other closed
      // reason is still overwritten — see `planBlock`.
      if (!conversation || isBlocked(conversation.closedReason)) continue;
      await ctx.db.patch("xolacer_conversations", conversationId, {
        status: "closed",
        closedReason: "blocked",
      });
    }
    return null;
  },
});

/**
 * Block the other party: freeze every Stream channel the pair holds, then
 * close every row they hold, in one mutation.
 *
 * If a freeze throws, nothing is marked and the user retries — freezing is
 * idempotent on Stream's side and an already-blocked pair plans as a noop, so
 * the retry is clean. No compensation logic.
 *
 * Permanent: `requestConversation` refuses to reopen a `blocked` row, and the
 * pair is read through `isPairBlocked` everywhere. There is no unblock.
 */
export const blockConversation = action({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const plan: {
      noop: boolean;
      channelsToFreeze: string[];
      rowsToClose: Id<"xolacer_conversations">[];
    } = await ctx.runQuery(internal.xolacerChat.getForBlock, {
      conversationId: args.conversationId,
    });
    // Already blocked — blocking twice is harmless, so a retry after a network
    // error must not error and must not make a second Stream call.
    if (plan.noop) return null;
    // Empty while a row is still `requested`: no channel exists yet, so only
    // the row is written.
    for (const channelId of plan.channelsToFreeze) {
      await freezeStreamChannel(channelId);
    }
    await ctx.runMutation(internal.xolacerChat.markBlocked, {
      conversationIds: plan.rowsToClose,
    });
    return null;
  },
});

export const resumeConversation = mutation({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.object({ resumed: v.boolean() }),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    if (conversation.status !== "resting") return { resumed: conversation.status === "open" };

    const xolacer = await getXolacerProfileByProfileId(
      ctx,
      conversation.xolacerProfileId,
    );
    const openCount = await countOpen(ctx, conversation.xolacerProfileId);
    if (!xolacerAvailable(xolacer, openCount)) {
      return { resumed: false };
    }
    // A block on the reverse pairing closes this door too — resuming is
    // exactly the "reach them again through the other role" this stops.
    // Reported as `resumed: false`, never thrown: the resting/closed copy is
    // deliberately identical for capacity and for a block, because nobody is
    // ever told they were blocked.
    if (
      await loadPairBlocked(
        ctx,
        conversation.userProfileId,
        conversation.xolacerProfileId,
      )
    ) {
      return { resumed: false };
    }
    // Resuming re-takes a slot, so it can't be the way around the cap. Thrown
    // rather than reported as `resumed: false`, which the client reads as the
    // xolacer being unavailable — the wrong person to explain.
    await requireOpenSlot(ctx, "seeker", conversation.userProfileId);
    await ctx.db.patch("xolacer_conversations", args.conversationId, {
      status: "open",
      lastMessageAt: Date.now(),
      // Cleared with the state it describes: leaving "manual" behind on an
      // open row would put wrap-up copy on the next quiet sweep.
      restingReason: undefined,
    });
    return { resumed: true };
  },
});

/** Client calls this after each sent message; drives the resting sweep. */
export const touchConversation = mutation({
  args: { conversationId: v.id("xolacer_conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) return null;
    const { conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    if (conversation.status !== "open") return null;
    await ctx.db.patch("xolacer_conversations", args.conversationId, { lastMessageAt: Date.now() });
    return null;
  },
});

/**
 * Has this webhook delivery already been processed? Records it if not.
 *
 * Shared by every `notifyNewMessage` branch: Stream retries any delivery it
 * cannot confirm, and the seen-check plus the insert share the caller's
 * transaction, so two concurrent copies of one event cannot both get through.
 */
async function webhookAlreadySeen(
  ctx: MutationCtx,
  webhookId: string | undefined,
): Promise<boolean> {
  if (!webhookId) return false;
  const seen = await ctx.db
    .query("stream_webhook_events")
    .withIndex("by_webhookId", (q) => q.eq("webhookId", webhookId))
    .unique();
  if (seen) return true;
  await ctx.db.insert("stream_webhook_events", { webhookId });
  return false;
}

/**
 * The Xolace channel's one-row last-message cache (#376), plus (#378) the
 * shared suppression stamp for its push fan-out — `lastNotifiedAt` is one
 * timestamp for the whole channel rather than per recipient, because every
 * recipient is notified together in the same `broadcastXolaceChannelPush`
 * run, so they are always all loud or all silent at once.
 */
async function cacheXolaceChannelMessage(
  ctx: MutationCtx,
  senderId: string,
  text: string | undefined,
): Promise<{ suppressed: boolean }> {
  const now = Date.now();
  const existing = await ctx.db.query("xolace_channel_cache").first();
  const suppressed = messageNotificationSuppressed(existing?.lastNotifiedAt, now);
  const row = {
    text: text ?? "",
    senderId,
    sentAt: now,
    lastNotifiedAt: suppressed ? existing?.lastNotifiedAt : now,
  };
  if (existing) await ctx.db.patch("xolace_channel_cache", existing._id, row);
  else await ctx.db.insert("xolace_channel_cache", row);
  return { suppressed };
}

/**
 * Tell the other party a message arrived, from Stream's `message.new` webhook.
 *
 * Every identity here comes off **our** row: the channel id names a
 * conversation, the sender is matched against that row's two participants, and
 * the recipient is whichever one is not them. Nothing in the webhook payload is
 * trusted to say who anyone is — so a forged event can address nobody it was
 * not already able to address, and sender-exclusion needs no check of its own.
 *
 * Every drop returns quietly rather than throwing: the caller answers Stream
 * with a 200 either way, and a webhook that reports failure is a webhook Stream
 * retries.
 */
export const notifyNewMessage = internalMutation({
  args: {
    channelId: v.string(),
    senderId: v.string(),
    // Stream's `X-Webhook-Id`, stable across its retries of the same event.
    // Optional: a delivery whose header was dropped, and any client older than
    // the deploy that started sending it, still counts as before.
    webhookId: v.optional(v.string()),
    // Only used by the Xolace-channel branch below, to populate the cache.
    // Absent for older webhook deliveries or a non-string payload field.
    text: v.optional(v.string()),
  },
  // Non-null only for the first delivery of a message from someone on the
  // row: what the webhook needs to schedule the post-delivery moderation lane
  // (#344) after this mutation — and its push — are already committed.
  returns: v.union(
    v.null(),
    v.object({
      conversationId: v.id("xolacer_conversations"),
      senderRole: conversationRoleValidator,
    }),
  ),
  handler: async (ctx, args) => {
    // The shared Xolace broadcast channel (CONTEXT.md, "The Xolace channel")
    // is universal and unrelated to xolacer peer chat — checked ahead of
    // `chatEnabled()` below, whose kill switch gates only the ambassador
    // DPA-gated feature, not this always-on channel. It is also not a
    // Conversation — no pairing, no lifecycle, one side is the app itself —
    // so it short-circuits to the denormalized cache (#376) ahead of the
    // `xolacer_conversations` resolution further down, which it would never
    // match anyway (its channel id carries no `xolacer_` prefix).
    if (args.channelId === XOLACE_CHANNEL_ID) {
      if (!(await webhookAlreadySeen(ctx, args.webhookId))) {
        const { suppressed } = await cacheXolaceChannelMessage(ctx, args.senderId, args.text);
        // Trusted the same way the conversation path trusts its own row's
        // participant ids rather than the webhook payload — but this channel
        // has no such row, so the check falls on the sender id directly. A
        // payload naming a sender who isn't a real profile fans out to
        // nobody rather than scheduling with a bogus exclude id.
        const senderProfileId = ctx.db.normalizeId("emotional_profiles", args.senderId);
        if (senderProfileId) {
          await ctx.scheduler.runAfter(0, internal.xolaceChannelNotifications.broadcastXolaceChannelPush, {
            excludeProfileId: senderProfileId,
            silent: suppressed,
          });
        }
      }
      return null;
    }

    if (!chatEnabled()) return null;

    const rawId = conversationIdFromChannelId(args.channelId);
    if (!rawId) return null;
    // Not just a shape check: an id from another table would otherwise be a
    // valid-looking `db.get` against the wrong row.
    const conversationId = ctx.db.normalizeId("xolacer_conversations", rawId);
    if (!conversationId) return null;

    const conversation = await ctx.db.get("xolacer_conversations", conversationId);
    if (!conversation) return null;

    // Counted before the status gate below, not after: a conversation that
    // keeps going quietly after the resting sweep is still a conversation, and
    // its messages are exactly the ones that should carry it over the rating
    // threshold. This is the server-authoritative per-message signal —
    // `touchConversation` is client-called and best-effort.
    //
    // Once per event, though: Stream retries any delivery it cannot confirm,
    // and a replayed `message.new` counted twice would hand a pair the rating
    // gate they had not reached. The seen-check and the insert share this
    // mutation's transaction, so two concurrent copies of one event cannot
    // both get through.
    const alreadyCounted = await webhookAlreadySeen(ctx, args.webhookId);
    if (!alreadyCounted) {
      await ctx.db.patch("xolacer_conversations", conversationId, {
        messageCount: (conversation.messageCount ?? 0) + 1,
        // Server-authoritative recency, so a conversation still being used
        // does not read as quiet when `touchConversation` never lands.
        // Monotonic: a retry or a clock skew must not walk the stamp back.
        lastMessageAt: Math.max(conversation.lastMessageAt ?? 0, Date.now()),
      });
    }

    const senderRole =
      args.senderId === conversation.userProfileId
        ? ("user" as const)
        : args.senderId === conversation.xolacerProfileId
          ? ("xolacer" as const)
          : null;
    const delivery = !alreadyCounted && senderRole ? { conversationId, senderRole } : null;

    // Stream cannot deliver into a channel we consider shut, but a resting or
    // blocked pair whose channel Stream has not frozen yet would still arrive
    // here — a closed conversation notifies nobody.
    if (conversation.status !== "open") return delivery;

    const recipientProfileId = messageNotificationRecipient(
      conversation,
      args.senderId,
    );
    if (!recipientProfileId) return delivery;

    // The recipient's own stamp, never the row's: the reply to a message must
    // not land inside the window that message opened.
    const now = Date.now();
    const notifiedField = messageNotifiedField(conversation, recipientProfileId);
    // Suppressed means no buzz, not no badge: a second message inside the
    // window still moves Stream's total, and the icon has to follow it or it
    // disagrees with the Connect tab until the next launch. The stamp is left
    // alone — the window is unchanged, only the badge rides through it.
    const suppressed = messageNotificationSuppressed(conversation[notifiedField], now);

    // Asked here as well as in the dispatch itself, because the stamp has to
    // mean "this person was buzzed". Burning the window on a send that the
    // recipient's preferences were always going to drop would leave them
    // silent for two minutes after turning chat notifications back on.
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", recipientProfileId),
      )
      .unique();
    if (!chatNotificationsAllowed(preferences?.notifications)) return delivery;

    if (suppressed) {
      await ctx.scheduler.runAfter(0, internal.chatNotifications.sendMessagePush, {
        emotionalProfileId: recipientProfileId,
        counterpartName: "",
        conversationId,
        silent: true,
      });
      return delivery;
    }

    // Stamped before the send is scheduled, in the same transaction, so a
    // burst arriving as separate webhook calls cannot each read a stale window.
    await ctx.db.patch("xolacer_conversations", conversationId, { [notifiedField]: now });

    // Whatever the recipient already calls the sender everywhere else: a
    // xolacer sees a pseudonym, a seeker sees the public display name.
    const senderIsXolacer = recipientProfileId === conversation.userProfileId;
    const xolacer = senderIsXolacer
      ? await getXolacerProfileByProfileId(ctx, conversation.xolacerProfileId)
      : null;
    // Through the badge-fetching action rather than `notifyConversation`: a
    // message push carries Stream's unread total for the icon badge, and only
    // an action can ask Stream for it.
    await ctx.scheduler.runAfter(0, internal.chatNotifications.sendMessagePush, {
      emotionalProfileId: recipientProfileId,
      counterpartName: senderIsXolacer
        ? (xolacer?.displayName ?? "Xolacer")
        : await ensureCamperName(ctx, conversation),
      conversationId,
    });
    return delivery;
  },
});

// ============================================================
// Ratings
// ============================================================

/**
 * Rate the xolacer, or change a rating already given. Only the person who
 * asked to talk may rate, and only once real messages were exchanged.
 *
 * The xolacer's counters are denormalized (Convex has no count operator), so
 * an edit applies the delta rather than re-summing — the aggregate stays O(1)
 * no matter how many conversations a xolacer has held.
 */
export const rateConversation = mutation({
  args: {
    conversationId: v.id("xolacer_conversations"),
    rating: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");

    const rounded = Math.round(args.rating);
    if (rounded < 1 || rounded > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const { profile, conversation, role } = await requireConversationParticipant(
      ctx,
      args.conversationId,
    );
    // A xolacer never rates the people who come to them — the relationship
    // isn't symmetric and a rated user would be a reason not to reach out.
    if (role !== "user") throw new Error("Only the requester can rate");
    // getConversation already returns canRate: false here, so this only ever
    // fires for a stale client — but it is the enforcement point standing
    // between a block and a public rating written in anger, against a
    // volunteer with no right of reply.
    if (isBlocked(conversation.closedReason)) {
      throw new Error("This conversation is closed");
    }
    // Through the shared predicate, so the message-count threshold is enforced
    // here and not merely suggested by the client's hidden CTA.
    if (!canRate(conversation, role)) {
      throw new Error("Nothing to rate yet");
    }

    const xolacer = await ctx.db
      .query("xolacer_profiles")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", conversation.xolacerProfileId),
      )
      .unique();
    if (!xolacer) throw new Error("Xolacer profile not found");

    const existing = await findRating(ctx, args.conversationId);
    const now = Date.now();

    if (existing) {
      if (existing.rating === rounded) return null;
      await ctx.db.patch("conversation_ratings", existing._id, { rating: rounded, updatedAt: now });
      await ctx.db.patch("xolacer_profiles", xolacer._id, {
        ratingSum: (xolacer.ratingSum ?? 0) - existing.rating + rounded,
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.insert("conversation_ratings", {
      conversationId: args.conversationId,
      raterProfileId: profile._id,
      xolacerProfileId: conversation.xolacerProfileId,
      rating: rounded,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("xolacer_profiles", xolacer._id, {
      ratingSum: (xolacer.ratingSum ?? 0) + rounded,
      ratingCount: (xolacer.ratingCount ?? 0) + 1,
      updatedAt: now,
    });
    return null;
  },
});

// ============================================================
// Stream token
// ============================================================

export const getStreamIdentity = internalQuery({
  args: {},
  returns: v.object({
    userId: v.id("emotional_profiles"),
    name: v.string(),
    image: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    // No branch on whether they're a published xolacer: this record is global
    // and would follow them into the conversations where they're an anonymous
    // seeker. See `upsertStreamUsers` — nothing reads it for display.
    return {
      userId: profile._id,
      name: GENERIC_CAMPER_NAME,
      image: await catalogAvatar(ctx, profile._id),
    };
  },
});

/**
 * Mint the Stream user token for the authenticated user. The Stream user id
 * is always the server-derived pseudonymous profile id — never a client arg.
 */
export const getStreamToken = action({
  args: {},
  returns: v.object({ apiKey: v.string(), token: v.string(), userId: v.string() }),
  handler: async (ctx) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const identity: {
      userId: Id<"emotional_profiles">;
      name: string;
      image?: string;
    } = await ctx.runQuery(internal.xolacerChat.getStreamIdentity, {});
    await upsertStreamUsers([
      { id: identity.userId, name: identity.name, image: identity.image },
    ]);
    const token = await mintUserToken(identity.userId);
    // apiKey ships with the token so the pair can never disagree — see
    // getStreamApiKey. Publishable value, safe to hand to the client.
    return {
      apiKey: getStreamApiKey(),
      token,
      userId: identity.userId as string,
    };
  },
});

// ============================================================
// Xolacer profile management
// ============================================================

export const myXolacerProfile = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      displayName: v.optional(v.string()),
      bio: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
      specialties: v.array(specialtyValidator),
      complete: v.boolean(),
      active: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    if (!chatEnabled()) return null;
    const { user, profile } = await requireAuth(ctx);
    if (!user.isXolacer) return null;
    const xolacer = await getXolacerProfileByProfileId(ctx, profile._id);
    if (!xolacer) return null;
    return {
      displayName: xolacer.displayName,
      bio: xolacer.bio,
      photoUrl: xolacer.photoUrl,
      specialties: xolacer.specialties ?? [],
      complete: xolacer.complete,
      active: xolacer.active,
    };
  },
});

export const upsertMyXolacerProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    specialties: v.optional(v.array(specialtyValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { user, profile } = await requireAuth(ctx);
    if (!user.isXolacer) throw new Error("Not a xolacer");

    if (args.bio !== undefined && args.bio.length > 160) {
      throw new Error("Bio must be 160 characters or fewer");
    }
    if (args.displayName !== undefined && args.displayName.length > 40) {
      throw new Error("Display name must be 40 characters or fewer");
    }
    if (args.specialties && args.specialties.length > MAX_SPECIALTIES) {
      throw new Error(`Pick at most ${MAX_SPECIALTIES}`);
    }

    const existing = await getXolacerProfileByProfileId(ctx, profile._id);
    if (existing) {
      await ctx.db.patch("xolacer_profiles", existing._id, { ...args, updatedAt: Date.now() });
      // Only bio and specialties are embedded (see textForIndex); a name-only save skips the embed.
      const embedded = (x: { bio?: string; specialties?: string[] }) => JSON.stringify([x.bio, x.specialties ?? []]);
      if (embedded(existing) !== embedded({ ...existing, ...args })) await reindexXolacer(ctx, profile._id);
      return null;
    }
    await ctx.db.insert("xolacer_profiles", {
      emotionalProfileId: profile._id,
      ...args,
      complete: false,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const generatePhotoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { user } = await requireAuth(ctx);
    if (!user.isXolacer) throw new Error("Not a xolacer");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Resolves the uploaded file to its serving URL and stores that, so the rest
 * of the app keeps reading a plain `photoUrl` string. Convex serving URLs are
 * stable, so there's no per-read resolution to do.
 */
export const setXolacerPhoto = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { user, profile } = await requireAuth(ctx);
    if (!user.isXolacer) throw new Error("Not a xolacer");

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload not found");

    const existing = await getXolacerProfileByProfileId(ctx, profile._id);
    if (existing) {
      // ponytail: replacing a photo orphans the previous blob — storing only
      // the URL means there's no storageId left to delete. Add a
      // `photoStorageId` field if xolacer photo churn ever matters.
      await ctx.db.patch("xolacer_profiles", existing._id, { photoUrl: url, updatedAt: Date.now() });
      return null;
    }
    await ctx.db.insert("xolacer_profiles", {
      emotionalProfileId: profile._id,
      photoUrl: url,
      complete: false,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Publish = the server-side mirror of "all fields present". */
export const publishProfile = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { user, profile } = await requireAuth(ctx);
    if (!user.isXolacer) throw new Error("Not a xolacer");

    const xolacer = await getXolacerProfileByProfileId(ctx, profile._id);
    if (
      !xolacer?.displayName ||
      !xolacer.bio ||
      !xolacer.photoUrl ||
      !xolacer.specialties?.length
    ) {
      throw new Error("Profile is incomplete");
    }
    await ctx.db.patch("xolacer_profiles", xolacer._id, { complete: true, updatedAt: Date.now() });
    await reindexXolacer(ctx, profile._id);
    return null;
  },
});

/**
 * Pause / unpause. `active` already gates the directory index and both
 * `xolacerAvailable` call sites, so flipping it is the whole feature: paused
 * xolacers leave the roster and can't be requested or resumed, while every
 * conversation they already have keeps working. Deliberately not a "go
 * offline" state — it survives app restarts, because the point is a xolacer
 * stepping away for a week, not for an evening.
 */
export const setXolacerActive = mutation({
  args: { active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!chatEnabled()) throw new Error("Xolacer chat is not available");
    const { user, profile } = await requireAuth(ctx);
    if (!user.isXolacer) throw new Error("Not a xolacer");

    const xolacer = await getXolacerProfileByProfileId(ctx, profile._id);
    if (!xolacer) throw new Error("No xolacer profile");
    await ctx.db.patch("xolacer_profiles", xolacer._id, { active: args.active, updatedAt: Date.now() });
    await reindexXolacer(ctx, profile._id);
    return null;
  },
});

/** Re-index after any change to what's embedded or whether they may be suggested. */
async function reindexXolacer(ctx: MutationCtx, emotionalProfileId: Id<"emotional_profiles">) {
  await ctx.scheduler.runAfter(0, internal.ai.xolacers.embed.indexXolacer, { emotionalProfileId });
}

// ============================================================
// Lifecycle sweep (cron)
// ============================================================

export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Open but quiet for 14 days → resting (silent; frees the cap slot).
    const quiet = await ctx.db
      .query("xolacer_conversations")
      .withIndex("by_status_and_lastMessageAt", (q) =>
        q.eq("status", "open").lt("lastMessageAt", now - RESTING_AFTER_MS),
      )
      .take(100);
    for (const conversation of quiet) {
      await ctx.db.patch("xolacer_conversations", conversation._id, {
        status: "resting",
        restingReason: "quiet",
      });
    }

    // Requested but unanswered for 48 hours → closed/expired, and the seeker
    // is told. Closing the row is what frees their pending-request slot, so a
    // request nobody picked up can never hold one of the three against them.
    // No cooldown is written: silence is not a refusal, and the same xolacer
    // may be asked again immediately.
    //
    // Requested rows are few (single-digit xolacers), so a bounded take +
    // in-memory age check is fine. ponytail: index on requestedAt if this grows.
    const requested = await ctx.db
      .query("xolacer_conversations")
      .withIndex("by_status_and_lastMessageAt", (q) => q.eq("status", "requested"))
      .take(100);
    for (const conversation of requested) {
      if (hasRequestExpired(conversation.requestedAt, now)) {
        await ctx.db.patch("xolacer_conversations", conversation._id, {
          status: "closed",
          closedReason: "expired",
        });
        await notifyConversation(
          ctx,
          "chat_expired",
          conversation._id,
          conversation.userProfileId,
        );
      }
    }

    // Retire webhook-dedupe rows a day old — Stream gives up retrying long
    // before that, so nothing past the window can still be deduped against.
    // ponytail: bounded per pass; the six-hourly cadence catches the rest.
    const stale = await ctx.db
      .query("stream_webhook_events")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", now - 24 * 60 * 60 * 1000),
      )
      .take(500);
    for (const row of stale) {
      await ctx.db.delete("stream_webhook_events", row._id);
    }
  },
});

// ============================================================
// Account-deletion support
// ============================================================

/**
 * Fail-open Stream cleanup: a Stream outage must never block a user's
 * deletion request. Failures are logged for manual retry.
 */
export const purgeStreamUser = internalAction({
  args: { profileId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      await deleteStreamUser(args.profileId);
    } catch (error) {
      console.error(
        `[xolacerChat] Stream user deletion failed for ${args.profileId}; retry manually`,
        error,
      );
    }
    return null;
  },
});
