import { v } from "convex/values";
import { httpAction, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { shouldModerateChatMessage } from "./ai/chat/classify";
import { CRISIS_RESOURCES_KIND } from "./ai/chat/moderate";
import {
  listStreamEventHooks,
  setStreamEventHooks,
  verifyStreamWebhookSignature,
  type StreamEventHook,
} from "./integrations/stream";

/**
 * Stream's event webhook — the only server-side signal that a message was sent.
 *
 * Stream's *dedicated push webhook* was rejected for this: its payload names
 * neither the sender nor the recipient, so deriving who to notify would cost a
 * Stream REST round trip per message. The general event webhook carries both.
 *
 * Everything past verification returns 200, including every event we drop. A
 * non-2xx here is a retry from Stream's side and, after enough of them, a hook
 * Stream disables — neither is an appropriate answer to "this event was not
 * interesting".
 */
export const streamEvents = httpAction(async (ctx, request) => {
  // The raw bytes, not the parsed object: the HMAC is over the exact bytes
  // Stream signed, and re-serializing JSON does not reproduce them.
  //
  // Stream gzips payloads above a size threshold (`enable_hook_payload_compression`,
  // on by default for apps created after 2026-05-07) and Convex hands the body
  // over untouched, so `request.text()` would decode gzip bytes as UTF-8 and
  // sign garbage. Sniffing the magic bytes rather than `content-encoding`
  // follows Stream's own reference handler and survives a proxy dropping the
  // header. Small payloads arrive uncompressed even with the flag on — which is
  // why this only ever bit production.
  const body = new Uint8Array(await request.arrayBuffer());
  let rawBody: string;
  if (body[0] === 0x1f && body[1] === 0x8b) {
    try {
      rawBody = await ctx.runAction(internal.streamGunzip.gunzip, {
        body: body.buffer,
      });
    } catch {
      // Corrupt gzip, or a bomb over the decompression cap. Neither is a real
      // Stream event and neither gets better on a retry — drop it like any
      // other uninteresting body rather than inviting the sender to repeat it.
      return new Response(null, { status: 200 });
    }
  } else {
    rawBody = new TextDecoder().decode(body);
  }
  const signed = await verifyStreamWebhookSignature(
    rawBody,
    request.headers.get("x-signature"),
  );
  // The one failure that is not a 200. An unsigned request is not Stream, and
  // there is nothing to retry.
  if (!signed) return new Response("invalid signature", { status: 401 });

  let event: {
    type?: unknown;
    channel_id?: unknown;
    user?: { id?: unknown };
    message?: { id?: unknown; text?: unknown; kind?: unknown };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 200 });
  }

  if (event.type !== "message.new") return new Response(null, { status: 200 });
  const senderId = event.user?.id;
  if (typeof event.channel_id !== "string" || typeof senderId !== "string") {
    return new Response(null, { status: 200 });
  }

  // Stream reuses this id across every retry of the same event, which is what
  // makes the message count safe against a redelivery. Absent header (a hook
  // or proxy that drops it) falls through to counting, as before.
  const webhookId = request.headers.get("x-webhook-id") ?? undefined;

  // Our own resources card comes back through here like any message. It is
  // nobody's message: not counted, not notified, not moderated.
  if (event.message?.kind === CRISIS_RESOURCES_KIND) {
    return new Response(null, { status: 200 });
  }

  const delivery = await ctx.runMutation(internal.xolacerChat.notifyNewMessage, {
    channelId: event.channel_id,
    senderId,
    webhookId,
    text: typeof event.message?.text === "string" ? event.message.text : undefined,
  });

  // The post-delivery moderation lane (#344), queued after the mutation — and
  // the push it scheduled — have committed, so it can neither delay nor break
  // a notification. `delivery` is null on a redelivery, which is the dedupe.
  const message = event.message;
  if (
    delivery &&
    typeof message?.id === "string" &&
    typeof message.text === "string" &&
    shouldModerateChatMessage(message.text)
  ) {
    await ctx.scheduler.runAfter(0, internal.ai.chat.moderate.moderateChatMessage, {
      ...delivery,
      streamChannelId: event.channel_id,
      streamMessageId: message.id,
      text: message.text,
    });
  }
  return new Response(null, { status: 200 });
});

const WEBHOOK_PATH = "/webhooks/stream";
const EVENT_TYPES = ["message.new"];

/**
 * Point this deployment's Stream app at this deployment's webhook.
 *
 * Run per environment — dev and prod are separate Stream apps with separate
 * secrets, and each one has to be pointed at its own deployment:
 *
 *   bun stream:webhook           # dev
 *   bun stream:webhook:prod      # production
 *
 * Read-append-write, deliberately: Stream has no add-one endpoint, and a PATCH
 * deletes every hook missing from the array you submit. Hooks we did not create
 * are passed back verbatim.
 *
 * Idempotent — a second run finds our URL already registered and updates that
 * entry in place rather than adding a duplicate.
 */
export const registerWebhook = internalAction({
  args: {},
  returns: v.object({ url: v.string(), hooks: v.number() }),
  handler: async () => {
    // Convex hands every deployment its own HTTP-actions origin, so the URL is
    // never configured and can never point at the wrong environment.
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) throw new Error("CONVEX_SITE_URL is not set");
    const url = `${siteUrl}${WEBHOOK_PATH}`;

    const existing = await listStreamEventHooks();
    const ours: StreamEventHook = {
      hook_type: "webhook",
      enabled: true,
      webhook_url: url,
      event_types: EVENT_TYPES,
    };

    const index = existing.findIndex((hook) => hook.webhook_url === url);
    const hooks =
      index === -1
        ? [...existing, ours]
        : existing.map((hook, i) =>
            i === index ? { ...hook, ...ours } : hook,
          );

    await setStreamEventHooks(hooks);
    return { url, hooks: hooks.length };
  },
});
