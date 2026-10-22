import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";
import { components } from "./_generated/api";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";

/**
 * App-wide presence: one room, one heartbeat per client.
 *
 * Every presence signal in the product is a narrow server-side query over this
 * one room returning only its own derived answer — never a room of its own.
 * Per-purpose rooms would mean one heartbeat per room per client, all
 * reporting the identical fact that a human has the app open.
 *
 * NOTE: this file must stay at `convex/presence.ts` exporting `disconnect`.
 * The react-native hook's background handler posts to `/api/mutation` with the
 * path `"presence:disconnect"` hardcoded, so renaming the module silently
 * breaks graceful disconnect on backgrounding.
 */
export const presence = new Presence(components.presence);

/** The single room. Users are members; membership never reaches a client. */
export const PRESENCE_ROOM = "app";

/**
 * 30s. The component's session timeout is interval x 2.5, so a dropped client
 * is detected in ~75s. Nothing forces the documented 10s default, and no user
 * can perceive the difference on a signal that means "is around".
 */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Every authenticated user heartbeats. The "You're listed" switch gates
 * *visibility*, not the heartbeat: the room contains seekers too, and a
 * xolacer is also a seeker, so gating on `active` would suppress the
 * seeker-side signal. Filtering to listed xolacers stays in the directory
 * query, where the complete-and-active index already does it.
 */
export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  returns: v.object({ roomToken: v.string(), sessionToken: v.string() }),
  handler: async (ctx, args) => {
    // Identity is derived server-side. `args.userId` exists only to satisfy
    // the hook's signature and is ignored — a client cannot heartbeat as
    // someone else, and cannot pick its own room.
    const { profile } = await requireAuth(ctx);
    return await presence.heartbeat(
      ctx,
      PRESENCE_ROOM,
      profile._id,
      args.sessionId,
      // Nor can it choose how long it stays present. The component sets the
      // session deadline to `interval * 2.5`, so an unclamped arg is a
      // client-controlled expiry: `interval: 3_600_000` keeps a green dot on
      // the roster for 2.5 hours after the app is gone, which is exactly the
      // failure this feature exists to prevent — a seeker reaching for
      // someone who isn't there. Clamped rather than replaced so a client
      // beating *faster* than us still gets a deadline that matches its own
      // cadence instead of one 2.5 intervals too generous.
      Math.min(args.interval, HEARTBEAT_INTERVAL_MS),
    );
  },
});

/**
 * The privacy boundary is the query, not the room. Room membership must never
 * reach a client: "this person is using a mental health app right now" is
 * never a readable fact. Nothing in the UI reads this hook's return value and
 * `FacePile` is not used, so this returns an empty array by design — do not
 * "fix" it by proxying `presence.list`.
 */
export const list = query({
  args: { roomToken: v.string() },
  returns: v.array(
    v.object({
      userId: v.string(),
      online: v.boolean(),
      lastDisconnected: v.number(),
    }),
  ),
  handler: async () => [],
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // No auth check: the hook fires this over plain HTTP from the background
    // handler, with no Convex auth token attached. Possession of the opaque
    // session token is the authorization, and it only ends that one session.
    return await presence.disconnect(ctx, args.sessionToken);
  },
});

const PRESENCE_ROOM_LIMIT = 512;

/**
 * THE accessor. Every presence read in the app goes through this, so the
 * system answering "who is here now" can change in one place.
 *
 * One room read serves a whole query — cheaper than a per-user read.
 */
export async function presentProfileIds(
  ctx: QueryCtx,
): Promise<Set<Id<"emotional_profiles">>> {
  // ponytail: the ceiling is PRESENCE_ROOM_LIMIT concurrent *app users*, not
  // xolacers — the room is app-wide and mostly seekers, so it arrives sooner
  // than a xolacer headcount suggests.
  //
  // Past it the truncation is not random: `room_order` is
  // [roomId, online, lastDisconnected], and every online row carries
  // lastDisconnected 0, so ties resolve by _creationTime and the oldest
  // presence rows always win. A xolacer whose row was created later would
  // read as absent permanently rather than intermittently.
  //
  // Absent is still the safe direction to fail, and at current scale (single-
  // digit xolacers) we are nowhere near. The upgrade is a per-candidate
  // `presence.listUser` read, which also narrows this query's read set — see
  // the note in xolacerChat.directory.
  const online = await presence.listRoom(
    ctx,
    PRESENCE_ROOM,
    true,
    PRESENCE_ROOM_LIMIT,
  );
  return new Set(online.map((p) => p.userId as Id<"emotional_profiles">));
}
