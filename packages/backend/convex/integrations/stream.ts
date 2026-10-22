/**
 * Stream Chat server-side integration — plain fetch + Web Crypto, so it runs
 * in Convex's default runtime (no "use node", no Stream server SDK).
 *
 * Endpoint and JWT shapes are mirrored from the installed `stream-chat`
 * package source (signing.ts / client.ts):
 *  - user token:   HS256 JWT, payload { user_id, exp }, no iat
 *  - server token: HS256 JWT, payload { server: true }
 *  - auth:         ?api_key=<key> + Authorization: <jwt> + stream-auth-type: jwt
 *  - upsert users: POST /users            { users: { [id]: user } }
 *  - channel:      POST /channels/messaging/{id}/query { data, state }
 *  - freeze:       PATCH /channels/messaging/{id} { set: { frozen: true } }
 *  - delete user:  DELETE /users/{id}?mark_messages_deleted&hard_delete
 *  - app settings: GET /app, PATCH /app { event_hooks: [...] }
 *  - channel type: GET/PUT /channeltypes/{name}; blocklists: GET/POST /blocklists, PUT /blocklists/{name}
 *  - system msg:   POST /channels/messaging/{id}/message { message: { type: "system", ... }, skip_push }
 *  - flag message: POST /moderation/flag { target_message_id }
 *  - webhook sig:  hex HMAC-SHA256 of the raw body, keyed by the API secret
 */

import { timingSafeEqual } from "../lib/timingSafeEqual";

const BASE_URL = "https://chat.stream-io-api.com";

function getStreamEnv() {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("STREAM_API_KEY / STREAM_API_SECRET not configured");
  }
  return { apiKey, apiSecret };
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The one HMAC-SHA256 key import — shared by JWT signing and webhook verification. */
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const header = base64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(`${header}.${body}`),
  );
  return `${header}.${body}.${base64url(new Uint8Array(signature))}`;
}


/**
 * Is this webhook really from Stream?
 *
 * Stream signs the **raw** request body with the app secret — hex HMAC-SHA256,
 * in the `X-Signature` header — which is the same secret and the same primitive
 * the JWTs above use, so no new environment variable exists for the webhook.
 * Mirrors `verifySignature` in the `stream-chat` package's signing.ts.
 */
export async function verifyStreamWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false;
  const { apiSecret } = getStreamEnv();
  const digest = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(apiSecret),
    new TextEncoder().encode(rawBody),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqual(hex, signature);
}

/**
 * The publishable Stream key, handed to the client alongside its token. The
 * client deliberately does not keep its own copy: a token signed with this
 * app's secret is only valid against this app's key, so any drift between two
 * env vars fails as an unreadable WS signature error at connect time.
 */
export function getStreamApiKey(): string {
  return getStreamEnv().apiKey;
}

/**
 * The client persists this token on-device so a returning chat user skips the
 * mint on cold start (#342). The `exp` is what bounds that: a lost phone's
 * copy stops working on its own, and a live client refreshes silently through
 * its `tokenProvider` when Stream rejects the stale one.
 */
export const USER_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Client-facing Stream user token. userId is always a pseudonymous profile id. */
export async function mintUserToken(userId: string): Promise<string> {
  const { apiSecret } = getStreamEnv();
  const exp = Math.floor(Date.now() / 1000) + USER_TOKEN_TTL_SECONDS;
  return signJwt({ user_id: userId, exp }, apiSecret);
}

async function streamRequest(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: { query?: Record<string, string>; body?: unknown } = {},
): Promise<Record<string, unknown>> {
  const { apiKey, apiSecret } = getStreamEnv();
  const serverToken = await signJwt({ server: true }, apiSecret);
  const url = new URL(BASE_URL + path);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    url.searchParams.set(k, v);
  }
  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: serverToken,
      "stream-auth-type": "jwt",
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stream ${method} ${path} failed (${response.status}): ${text}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

export type StreamUser = { id: string; name?: string; image?: string };

/**
 * Batch upsert Stream users (id = emotionalProfileId, display data only).
 *
 * **The record is deliberately pseudonymous, always.** There is one global,
 * mutable Stream user per profile id, and the same person is a named xolacer in
 * one conversation and an anonymous seeker in another — so no single record can
 * be right, and a real name written here would render wherever their anonymous
 * side is shown. Every caller passes the generic "Camper" placeholder and the
 * catalog avatar, whether or not the person is a published xolacer — a name
 * that identifies nobody, so a surface that ever escapes the client-side
 * override fails safe instead of leaking a correlatable one (see
 * lib/camperTag). Real identity is resolved
 * per-conversation and per-role by `getConversation`, and the client overrides
 * every Stream surface that renders a name or image with it — see
 * COMPONENT_OVERRIDES in `thread-messages.tsx`.
 */
export async function upsertStreamUsers(users: StreamUser[]): Promise<void> {
  const userMap: Record<string, StreamUser> = {};
  for (const user of users) userMap[user.id] = user;
  await streamRequest("POST", "/users", { body: { users: userMap } });
}

/**
 * Create only the users Stream doesn't know yet. `POST /users` is a full
 * replace, so an `{id, name}`-only upsert of an existing record would wipe its
 * `image` (and any custom field) — the membership flows that just need the id
 * to exist go through this instead.
 */
export async function ensureStreamUsers(users: StreamUser[]): Promise<void> {
  const missing: StreamUser[] = [];
  // ponytail: $in and query limit cap at 100 ids per call
  for (let i = 0; i < users.length; i += 100) {
    const chunk = users.slice(i, i + 100);
    const result = await streamRequest("GET", "/users", {
      query: {
        payload: JSON.stringify({
          filter_conditions: { id: { $in: chunk.map((u) => u.id) } },
          limit: chunk.length,
        }),
      },
    });
    const known = new Set(((result.users ?? []) as { id: string }[]).map((u) => u.id));
    for (const u of chunk) if (!known.has(u.id)) missing.push(u);
  }
  if (missing.length > 0) await upsertStreamUsers(missing);
}

/** Partial update — touches only the given fields of an existing user. */
export async function setStreamUserFields(
  id: string,
  set: Omit<StreamUser, "id">,
): Promise<void> {
  await streamRequest("PATCH", "/users", { body: { users: [{ id, set }] } });
}

/**
 * Create (or return) the 1:1 messaging channel for a conversation.
 * Channel id is deterministic per conversation row, so accept is idempotent.
 */
export async function createXolacerChannel(
  channelId: string,
  memberIds: string[],
  createdById: string,
): Promise<void> {
  await upsertStreamChannel("messaging", channelId, { members: memberIds, createdById });
}

/**
 * Freeze a channel — Stream itself then refuses sends from both members, so a
 * block is enforced at the server rather than in either client's view. Partial
 * update: everything else about the channel is left alone, and re-freezing an
 * already-frozen channel is a no-op on Stream's side.
 */
export async function freezeStreamChannel(channelId: string): Promise<void> {
  await streamRequest("PATCH", `/channels/messaging/${encodeURIComponent(channelId)}`, {
    body: { set: { frozen: true } },
  });
}

/**
 * A Stream V2 event hook, as it appears in app settings. Only the fields we
 * read or write — Stream returns more, and every one of them has to survive a
 * round trip untouched, so hooks we did not create are passed back verbatim.
 */
export type StreamEventHook = {
  hook_type?: string;
  enabled?: boolean;
  webhook_url?: string;
  event_types?: string[];
  [key: string]: unknown;
};

/** Every event hook currently registered on this Stream app. */
export async function listStreamEventHooks(): Promise<StreamEventHook[]> {
  const response = await streamRequest("GET", "/app");
  const app = response.app as { event_hooks?: StreamEventHook[] } | undefined;
  return app?.event_hooks ?? [];
}

/**
 * Replace the app's event-hook array.
 *
 * **Stream deletes any hook absent from what you submit**, so the caller must
 * pass the full list — read, append, write. There is no add-one endpoint.
 */
export async function setStreamEventHooks(
  hooks: StreamEventHook[],
): Promise<void> {
  await streamRequest("PATCH", "/app", { body: { event_hooks: hooks } });
}

/** Hard-delete a Stream user and their messages (account-deletion path). */
export async function deleteStreamUser(userId: string): Promise<void> {
  await streamRequest("DELETE", `/users/${encodeURIComponent(userId)}`, {
    query: { mark_messages_deleted: "true", hard_delete: "true" },
  });
}

/**
 * The user's unread total as Stream holds it — the same number the client
 * derives from its event stream (`badgeFromEvents`), read here so a push can
 * set the icon badge to it. GET /unread?user_id= is the server-side form of the
 * client's `getUnreadCount`.
 */
export async function getStreamUnreadCount(userId: string): Promise<number> {
  const response = await streamRequest("GET", "/unread", { query: { user_id: userId } });
  const total = response.total_unread_count;
  if (typeof total !== "number") throw new Error("Stream /unread returned no total");
  return total;
}

/**
 * Flag a user in Stream's moderation queue on the reporter's behalf, so a
 * Report filed in the concern tray also shows in the dashboard the maintainer
 * already watches for message flags. Mirrors the client's `flagUser` with the
 * server-side `user_id` option naming who is flagging.
 */
export async function flagStreamUser(targetId: string, reporterId: string): Promise<void> {
  await streamRequest("POST", "/moderation/flag", {
    body: { target_user_id: targetId, user_id: reporterId },
  });
}

// ============================================================
// Moderation lanes (#344)
// ============================================================

/**
 * The Stream user the resources card is sent as and the flag is filed by.
 * Stream requires a user on both, and neither participant is the right one —
 * it is the app speaking. Upserted before every use: cheap, idempotent, and
 * it spares a one-time setup step per environment.
 */
export const XOLACE_SYSTEM_USER_ID = "xolace";

async function ensureSystemUser(): Promise<void> {
  await upsertStreamUsers([{ id: XOLACE_SYSTEM_USER_ID, name: "Xolace" }]);
}

/**
 * Flag a message into the dashboard queue on the app's own behalf — the
 * post-delivery lane's answer to harassment, spam and contact leaks. Same
 * endpoint as `flagStreamUser`; the queue names the system user as flagger.
 */
export async function flagStreamMessage(messageId: string, reason: string): Promise<void> {
  await ensureSystemUser();
  await streamRequest("POST", "/moderation/flag", {
    body: { target_message_id: messageId, reason, user_id: XOLACE_SYSTEM_USER_ID },
  });
}

/**
 * A `type: "system"` message from the app into a channel, marked `silent`
 * (no unread increment, no `message.new` push) with `skip_push` (no push at
 * all). The channel type's `skip_last_msg_update_for_system_msgs` (see
 * `lib/streamSetup`) keeps it from bumping `last_message_at`. Custom fields
 * ride at the top level of the message, where the client SDK reads them.
 */
export async function sendStreamSystemMessage(
  channelId: string,
  message: { text: string; id?: string } & Record<string, unknown>,
): Promise<void> {
  await ensureSystemUser();
  try {
    await streamRequest("POST", `/channels/messaging/${encodeURIComponent(channelId)}/message`, {
      body: {
        message: { ...message, type: "system", user_id: XOLACE_SYSTEM_USER_ID, silent: true },
        skip_push: true,
      },
    });
  } catch (error) {
    // A caller-supplied `id` makes the send idempotent: Stream rejects a
    // duplicate with 400 "message with ID … already exists", which means the
    // earlier attempt landed — a retry treats that as delivered.
    if (message.id && isStreamDuplicateMessage(error)) return;
    throw error;
  }
}

function isStreamDuplicateMessage(error: unknown): boolean {
  return error instanceof Error && /\(400\).*already exists/i.test(error.message);
}

/** The `messaging` channel type as Stream holds it, every field. */
export async function getStreamChannelType(name: string): Promise<Record<string, unknown>> {
  return streamRequest("GET", `/channeltypes/${encodeURIComponent(name)}`);
}

/** Top-level scalars merge; nested arrays (`blocklists`) replace — submit them whole. */
export async function updateStreamChannelType(
  name: string,
  body: Record<string, unknown>,
): Promise<void> {
  await streamRequest("PUT", `/channeltypes/${encodeURIComponent(name)}`, { body });
}

/**
 * Same lookup as `getStreamChannelType`, but returns null instead of throwing when the type
 * doesn't exist yet — how `streamSetup`'s plan tells "needs update" from "needs creation" for a
 * channel type that isn't guaranteed to exist on every Stream app (unlike the built-in `messaging`).
 */
export async function tryGetStreamChannelType(
  name: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await getStreamChannelType(name);
  } catch (error) {
    if (error instanceof Error && /\(404\)/.test(error.message)) return null;
    throw error;
  }
}

/** POST /channeltypes — Stream requires only `name`; every other field defaults from the
 * built-in `messaging` type when omitted. */
export async function createStreamChannelType(body: Record<string, unknown>): Promise<void> {
  await streamRequest("POST", "/channeltypes", { body });
}

/**
 * Custom permission roles are app-wide and must be registered once (`CreateRole`) before a
 * channel type's `grants` can reference the role name as a key — Stream rejects an
 * unregistered role there.
 */
export async function listStreamRoles(): Promise<string[]> {
  const response = await streamRequest("GET", "/roles");
  const roles = response.roles as Array<{ name?: string }> | undefined;
  return (roles ?? []).map((r) => r.name).filter((n): n is string => !!n);
}

export async function createStreamRole(name: string): Promise<void> {
  await streamRequest("POST", "/roles", { body: { name } });
}

/**
 * Create (or return) a channel under an arbitrary channel type — the general form of
 * `createXolacerChannel`, which hardcodes `messaging`. Used for the fixed Xolace singleton.
 */
export async function upsertStreamChannel(
  channelType: string,
  channelId: string,
  data: { members: string[]; createdById: string },
): Promise<void> {
  await streamRequest(
    "POST",
    `/channels/${encodeURIComponent(channelType)}/${encodeURIComponent(channelId)}/query`,
    { body: { data: { members: data.members, created_by_id: data.createdById }, state: false } },
  );
}

/**
 * Add members to an existing channel.
 *
 * **Confirmed against the real API (#374): Stream does NOT upsert a shell
 * user for an unknown id here** — `POST /channels/{type}/{id}` rejects with
 * "involved in channel update operation, but don't exist" for any member id
 * that has no Stream user record yet. (`createXolacerChannel` /
 * `upsertStreamChannel` are unaffected — that's the `/query` create endpoint,
 * which upserts via its `data`.) So the caller must `upsertStreamUsers` first;
 * this never waits on the member minting their own Stream credential, since
 * the app can upsert a pseudonymous placeholder on their behalf. Adding an id
 * that's already a member is a no-op on Stream's side, so this is safe to
 * call repeatedly for the same member.
 */
export async function addStreamChannelMembers(
  channelType: string,
  channelId: string,
  memberIds: string[],
): Promise<void> {
  await streamRequest(
    "POST",
    `/channels/${encodeURIComponent(channelType)}/${encodeURIComponent(channelId)}`,
    { body: { add_members: memberIds } },
  );
}

/**
 * Per-member channel-role assignment — the mechanism that lets one member post in a channel
 * type whose default `channel_member` role cannot (see `lib/streamSetup`'s
 * `XOLACE_BROADCASTER_ROLE`). Mirrors the `stream-chat` package's `Channel.assignRoles`, which
 * posts (not patches) `{ assign_roles }` to the channel's own endpoint.
 */
export async function assignStreamChannelRole(
  channelType: string,
  channelId: string,
  roles: { userId: string; channelRole: string }[],
): Promise<void> {
  await streamRequest(
    "POST",
    `/channels/${encodeURIComponent(channelType)}/${encodeURIComponent(channelId)}`,
    { body: { assign_roles: roles.map((r) => ({ user_id: r.userId, channel_role: r.channelRole })) } },
  );
}

export type StreamBlockList = { name: string; type?: string; words: string[] };

export async function listStreamBlockLists(): Promise<StreamBlockList[]> {
  const response = await streamRequest("GET", "/blocklists");
  return (response.blocklists as StreamBlockList[] | undefined) ?? [];
}

export async function createStreamBlockList(list: StreamBlockList): Promise<void> {
  await streamRequest("POST", "/blocklists", { body: list });
}

export async function updateStreamBlockList(name: string, words: string[]): Promise<void> {
  await streamRequest("PUT", `/blocklists/${encodeURIComponent(name)}`, { body: { words } });
}

export async function deleteStreamBlockList(name: string): Promise<void> {
  await streamRequest("DELETE", `/blocklists/${encodeURIComponent(name)}`);
}

/** The Moderation v2 policy for a key such as `chat:messaging`, every field. A fresh app
 * (prod before first setup) has no policy row yet — Stream 404s — so that comes back as the
 * bare `{ key }` the planner needs to create it. */
export async function getStreamModerationPolicy(key: string): Promise<Record<string, unknown>> {
  try {
    const response = await streamRequest("GET", `/api/v2/moderation/config/${encodeURIComponent(key)}`);
    return response.config as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && /\(404\)/.test(error.message)) return { key };
    throw error;
  }
}

/** Replaces the policy — submit it whole (see `lib/streamSetup.planModerationPolicy`). */
export async function upsertStreamModerationPolicy(body: Record<string, unknown>): Promise<void> {
  await streamRequest("POST", "/api/v2/moderation/config", { body });
}
