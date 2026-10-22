/**
 * The Stream app configuration as code: what the `messaging` channel type and
 * our blocklists should look like, and the pure diff that turns what Stream
 * currently returns into the PUT that gets there. `streamSetup.setup` reads,
 * plans, prints, and (on `--apply`) submits — this file never does I/O.
 *
 * The pre-delivery moderation lane lives here in its entirety (#344): Stream's
 * own regex/blocklist rules flag contact-sharing and URLs for dashboard review
 * without blocking or slowing a single message. Automod stays disabled and the
 * profanity list stays unattached — "I feel like shit" has to reach the person
 * listening.
 *
 * The lists attach through the Moderation v2 policy for the channel type
 * (`chat:messaging`, `block_list_config`), not the channel type's legacy
 * `blocklists` field — this app is on v2 and that field is inert here
 * (verified: a bare phone number sailed through with it set).
 */

/** The fields of a channel type this plan reads or writes. Stream returns many
 * more; they are passed through untouched because the PUT only carries these. */
export type ChannelTypeConfig = {
  automod?: string;
  automod_behavior?: string;
  max_message_length?: number;
  skip_last_msg_update_for_system_msgs?: boolean;
  [key: string]: unknown;
};

export type BlockListRule = { name: string; action: string };
export type BlockListPolicy = { enabled: boolean; rules: BlockListRule[] };

/** The v2 moderation policy fields this plan reads or writes. */
export type ModerationPolicy = {
  key: string;
  block_list_config?: BlockListPolicy | null;
  [key: string]: unknown;
};

export type BlockListConfig = { name: string; type: string; words: string[] };

/**
 * Regex rules, RE2 syntax (Stream's matcher — no lookaround). Each is one
 * "word" of a `type: "regex"` blocklist. Flagged, never blocked: a phone
 * number can be a step someone chose, and a human decides that, not a regex.
 */
export const CONTACT_LEAK_BLOCKLIST: BlockListConfig = {
  name: "contact_leak",
  type: "regex",
  words: [
    // Phone-number shapes: 9+ digits with optional +, spaces, dots, dashes, parens.
    String.raw`\+?\d[\d\s().-]{7,}\d`,
    // @handle
    String.raw`(^|\s)@[A-Za-z0-9_.]{3,}`,
    // Off-platform invitations. The unambiguous app names stand alone; the
    // short ones ("ig", "snap", "signal") are ordinary English and only count
    // as "my ig" / "on snap" / "via signal".
    String.raw`(?i)\b(whatsapp|telegram|snapchat|instagram|insta)\b`,
    String.raw`(?i)\b(my|on|via)\s+(ig|snap|signal)\b`,
  ],
};

export const DESIRED_MESSAGING = {
  // The resources card must not move the conversation up anyone's list.
  skip_last_msg_update_for_system_msgs: true,
};

export type DesiredMessaging = typeof DESIRED_MESSAGING;

/** The v2 policy key for the `messaging` channel type. */
export const MESSAGING_POLICY_KEY = "chat:messaging";

export const DESIRED_BLOCK_LIST_POLICY: BlockListPolicy = {
  enabled: true,
  rules: [
    { name: CONTACT_LEAK_BLOCKLIST.name, action: "flag" },
    // Stream's built-in URL regex list.
    { name: "url_detection_v1", action: "flag" },
  ],
};

export type ChannelTypePlan = {
  changes: Record<string, { from: unknown; to: unknown }>;
  /** The PUT body; the three fields the API marks required ride along. */
  body: ChannelTypeConfig;
};

export function planChannelTypeUpdate(
  current: ChannelTypeConfig,
  desired: DesiredMessaging,
): ChannelTypePlan | null {
  const changes: ChannelTypePlan["changes"] = {};
  const body: ChannelTypeConfig = {
    automod: current.automod,
    automod_behavior: current.automod_behavior,
    max_message_length: current.max_message_length,
  };

  const key = "skip_last_msg_update_for_system_msgs";
  if (current[key] !== desired[key]) {
    changes[key] = { from: current[key], to: desired[key] };
    body[key] = desired[key];
  }

  return Object.keys(changes).length === 0 ? null : { changes, body };
}

const ruleKey = (r: BlockListRule) => `${r.name}:${r.action}`;

/**
 * Order-insensitive compare of the policy's block-list rules. Returns the
 * upsert body or null when converged. Upsert REPLACES the policy (docs:
 * "If a configuration with the specified key already exists, it will be
 * replaced"), so every other engine's `*_config` rides along unchanged;
 * read-only fields (`created_at`, …) do not.
 */
export function planModerationPolicy(
  current: ModerationPolicy,
  desired: BlockListPolicy,
): { from: BlockListPolicy | null; body: ModerationPolicy } | null {
  const existing = current.block_list_config ?? null;
  const left = (existing?.rules ?? []).map(ruleKey).sort();
  const right = desired.rules.map(ruleKey).sort();
  const same =
    existing?.enabled === desired.enabled &&
    left.length === right.length &&
    left.every((k, i) => k === right[i]);
  if (same) return null;
  const body: ModerationPolicy = { key: current.key, block_list_config: desired };
  for (const [k, val] of Object.entries(current)) {
    if (k.endsWith("_config") && k !== "block_list_config" && val != null) body[k] = val;
  }
  return { from: existing, body };
}

// ============================================================
// `xolace-broadcast` channel type (#373) — the app-wide Xolace channel.
// One well-known channel type, one fixed singleton channel, one designated
// sender. `channel_member` gets read + reactions only; a purpose-built
// custom role (`XOLACE_BROADCASTER_ROLE`) carries the one `create-message`
// grant, assigned to exactly one member — never a channel-type default —
// via Stream's per-member `assign_roles`. A channel type's `grants` is a
// role → permissions map, and Stream requires a role be registered with
// `CreateRole` before it can appear as a `grants` key — that's why setup
// registers the role before creating/updating the channel type. This is the
// resolved answer to "custom role vs. per-member override": a custom role,
// recorded here per #373 rather than as an ADR (implementation detail, not
// a hard-to-reverse product decision — see
// docs/adr/0013-the-xolace-channel-is-stream-not-convex-native.md).
// ============================================================

export const XOLACE_BROADCAST_CHANNEL_TYPE = "xolace-broadcast";

/** Fixed constant, not derived from any row — contrast `xolacerChannelId()`. */
export const XOLACE_CHANNEL_ID = "xolace-announcements";

export const XOLACE_BROADCASTER_ROLE = "xolace_broadcaster";

export const DESIRED_XOLACE_BROADCAST: {
  read_events: boolean;
  typing_events: boolean;
  replies: boolean;
  grants: Record<string, string[]>;
} = {
  // Stream tracks per-user read state — and therefore `countUnread()` and
  // the channel's share of `total_unread_count` — only when read events are
  // on. Off, the row and the Connect-tab badge never light for a new
  // announcement (ADR 0013 assumed otherwise). Typing stays off: nobody but
  // the broadcaster can type, and the member list is the whole user base.
  // ponytail: `message.read` fans out to watchers only (Connect-tab users
  // warming the channel), not members; revisit if that fan-out shows up in
  // Stream's usage.
  read_events: true,
  typing_events: false,
  // No threads/replies — matches xolacer chat, which doesn't use them either.
  replies: false,
  grants: {
    channel_member: ["read-channel", "create-reaction", "delete-reaction-owner"],
    [XOLACE_BROADCASTER_ROLE]: [
      "read-channel",
      "create-message",
      "create-reaction",
      "delete-reaction-owner",
    ],
  },
};

export type DesiredXolaceBroadcast = typeof DESIRED_XOLACE_BROADCAST;

export type XolaceBroadcastConfig = {
  automod?: string;
  automod_behavior?: string;
  max_message_length?: number;
  read_events?: boolean;
  typing_events?: boolean;
  replies?: boolean;
  grants?: Record<string, string[]>;
  [key: string]: unknown;
};

export type XolaceBroadcastPlan =
  | { op: "create"; body: Record<string, unknown> }
  | {
      op: "update";
      changes: Record<string, { from: unknown; to: unknown }>;
      body: Record<string, unknown>;
    };

/**
 * Grants merge by role key onto Stream's full built-in defaults — a create/update submitting
 * only `{channel_member: [...], xolace_broadcaster: [...]}` leaves `admin`/`moderator`/etc.
 * untouched (confirmed against the dev app's real response). So the diff only ever looks at
 * the roles this plan manages, never at every key Stream happens to return.
 */
function sameGrants(
  current: Record<string, string[]> | undefined,
  desired: Record<string, string[]>,
): boolean {
  return Object.entries(desired).every(([role, perms]) => {
    const currentPerms = [...(current?.[role] ?? [])].sort();
    const desiredPerms = [...perms].sort();
    return (
      currentPerms.length === desiredPerms.length &&
      currentPerms.every((p, i) => p === desiredPerms[i])
    );
  });
}

/**
 * Unlike `planChannelTypeUpdate` (`messaging` always exists on any Stream app),
 * `xolace-broadcast` may not exist yet — `current` is null when
 * `GET /channeltypes/xolace-broadcast` 404s on a clean app, which `setup()`
 * turns into a create instead of an update.
 */
export function planXolaceBroadcastType(
  current: XolaceBroadcastConfig | null,
  desired: DesiredXolaceBroadcast,
): XolaceBroadcastPlan | null {
  if (!current) {
    return {
      op: "create",
      body: { name: XOLACE_BROADCAST_CHANNEL_TYPE, ...desired },
    };
  }

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of ["read_events", "typing_events", "replies"] as const) {
    if (current[key] !== desired[key]) {
      changes[key] = { from: current[key], to: desired[key] };
    }
  }
  if (!sameGrants(current.grants, desired.grants)) {
    changes.grants = { from: current.grants, to: desired.grants };
  }

  if (Object.keys(changes).length === 0) return null;

  return {
    op: "update",
    changes,
    body: {
      // The three fields Stream's PUT marks required (see `planChannelTypeUpdate`).
      automod: current.automod,
      automod_behavior: current.automod_behavior,
      max_message_length: current.max_message_length,
      read_events: desired.read_events,
      typing_events: desired.typing_events,
      replies: desired.replies,
      grants: desired.grants,
    },
  };
}

/**
 * Roles are app-wide and registered once (`CreateRole`), not per channel type —
 * this is the plan's "does it already exist" check ahead of that call.
 */
export function needsBroadcasterRole(existingRoles: string[]): boolean {
  return !existingRoles.includes(XOLACE_BROADCASTER_ROLE);
}

export type BlockListPlan =
  | { op: "create" }
  | { op: "update"; from: string[] }
  /** Stream's update endpoint cannot change `type`; delete and create instead. */
  | { op: "recreate"; from: { type: string; words: string[] } };

export function planBlockList(
  existing: BlockListConfig | undefined,
  desired: BlockListConfig,
): BlockListPlan | null {
  if (!existing) return { op: "create" };
  if (existing.type !== desired.type) {
    return { op: "recreate", from: { type: existing.type, words: existing.words } };
  }
  const same =
    existing.words.length === desired.words.length &&
    existing.words.every((w, i) => w === desired.words[i]);
  return same ? null : { op: "update", from: existing.words };
}
