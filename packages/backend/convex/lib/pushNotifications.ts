import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  classifyPushDevice,
  decidePushHistoryPrune,
  type PushDeviceVerdict,
  type PushHistoryRow,
} from "./pushDevices";

/**
 * Shared push notification component instance.
 *
 * Recipients are `push_devices` document ids — one per device — so a second
 * device does not replace the first. Typed as `string` rather than
 * `Id<"push_devices">` because pre-migration recipients are keyed by profile
 * id and stay valid until every client has re-registered; `string` is what the
 * component validates on the wire either way.
 */
export const pushNotifications = new PushNotifications<string>(
  components.pushNotifications,
);

type Notification = Parameters<
  typeof pushNotifications.sendPushNotification
>[1]["notification"];

/**
 * Bound on every per-profile device read. Nobody has more than a handful of
 * devices; the cap exists to keep the read bounded, and reads take the most
 * recently registered first so rotation orphans can never crowd out the live
 * device.
 *
 * ponytail: a profile that somehow exceeds this keeps a few inert component
 * recipients after deletion — nothing addresses them once the device rows are
 * gone. Batch-and-reschedule if that ever stops being implausible.
 */
export const MAX_DEVICES_PER_PROFILE = 50;

/**
 * Only the newest row decides whether a device is dead, but the whole window
 * has to be clear before its history can be pruned, and one read serves both.
 */
const PUSH_HISTORY_READ_LIMIT = 10;

/** A device's component notification history, newest first. */
async function pushDeviceHistory(
  ctx: MutationCtx,
  deviceId: Id<"push_devices">,
): Promise<PushHistoryRow[]> {
  const rows = await pushNotifications.getNotificationsForUser(ctx, {
    userId: deviceId,
    limit: PUSH_HISTORY_READ_LIMIT,
  });
  return rows.map(({ state, _creationTime }) => ({ state, _creationTime }));
}

/**
 * Drop one device: its stored notifications, then its component recipient, then
 * the registry row. Shared by registration, reaping, removal, and account
 * deletion — the three have to move together, and four copies is how one of
 * them gets forgotten.
 *
 * Notifications go first because the component resolves them through the token
 * row, so removing the token would strand the stored titles and bodies. That
 * matters most on ownership transfer, where the incoming profile registers the
 * same token and would otherwise be handed the previous owner's history.
 *
 * The clear runs through the same `decidePushHistoryPrune` veto as registration,
 * for the same reason: the component's delete takes in-flight rows with it, and
 * a sender that comes back to a missing document throws, rolling back the state
 * patches for up to 99 other users batched with it. Vetoing here does strand
 * this device's bodies for good — there is no next launch to retry on — but a
 * handful of orphaned rows in the rare in-flight case beats breaking somebody
 * else's batch.
 *
 * ponytail: the component clears 1000 notifications per call and reschedules
 * for the rest, but that continuation resolves through the token row removed
 * here, so a device holding more leaves the remainder orphaned. Registration
 * pruning keeps histories far below 1000; drain in a loop if it ever doesn't.
 */
export async function deletePushDevice(
  ctx: MutationCtx,
  deviceId: Id<"push_devices">,
): Promise<void> {
  await prunePushDeviceHistory(ctx, deviceId);
  await pushNotifications.removeToken(ctx, { userId: deviceId });
  // Logout, account deletion, and ownership transfer all remove devices, and
  // `db.delete` throws on an id that is already gone.
  if (await ctx.db.get("push_devices", deviceId)) {
    await ctx.db.delete("push_devices", deviceId);
  }
}

/**
 * Clear a device's stored notification bodies, which the component otherwise
 * keeps forever. Called at registration: that is when a device proves it is
 * alive and its failure history stops meaning anything, the same moment the
 * delivery verdict wants reset. A device that never registers again is cleaned
 * up by `deletePushDevice`, which routes through here for the veto.
 *
 * The device row carries the watch between calls, so the first registration
 * after a send stamps and the next one clears.
 */
export async function prunePushDeviceHistory(
  ctx: MutationCtx,
  deviceId: Id<"push_devices">,
): Promise<void> {
  const device = await ctx.db.get("push_devices", deviceId);
  if (!device) return;

  const { prune, watch } = decidePushHistoryPrune({
    rows: await pushDeviceHistory(ctx, deviceId),
    watch: device.historyWatch,
    now: Date.now(),
  });

  if (prune) {
    await pushNotifications.deleteNotificationsForUser(ctx, {
      userId: deviceId,
    });
  }
  // Cleared on a prune: the history it described is gone.
  await ctx.db.patch("push_devices", deviceId, { historyWatch: prune ? undefined : watch });
}

/** Every device for a profile, most recently registered first. */
export async function profilePushDevices(
  ctx: MutationCtx,
  emotionalProfileId: Id<"emotional_profiles">,
) {
  return await ctx.db
    .query("push_devices")
    .withIndex("by_profile", (q) =>
      q.eq("emotionalProfileId", emotionalProfileId),
    )
    .order("desc")
    .take(MAX_DEVICES_PER_PROFILE);
}

/**
 * How many devices one send may delete. `deletePushDevice` clears the device's
 * stored notifications too — up to 1000 row deletes — in this send's own
 * transaction. Reaping is hygiene and the send is the point, so the send never
 * gets to fail over it; the backlog goes with the next one, which is soon,
 * because reaping only happens where we are already sending.
 */
const MAX_REAPS_PER_SEND = 1;

/**
 * Split a profile's devices into the ones still worth sending to and the ones
 * that are gone, deleting a bounded number of the latter.
 *
 * Nothing tells us an app was uninstalled, so reaping rides along with sending:
 * the fan-out already reads every device row, work stays proportional to actual
 * sends, and a profile we never send to costs nothing to leave stale. No cron,
 * no scan, no cursor.
 *
 * Skipping and deleting are separate decisions — every dead device drops out of
 * this send whatever the delete budget is.
 */
async function reapDeadDevices(
  ctx: MutationCtx,
  devices: Doc<"push_devices">[],
): Promise<Doc<"push_devices">[]> {
  const now = Date.now();
  const live: Doc<"push_devices">[] = [];
  const gone: {
    device: Doc<"push_devices">;
    verdict: Exclude<PushDeviceVerdict, "keep">;
  }[] = [];

  for (const device of devices) {
    const history = await pushDeviceHistory(ctx, device._id);
    const verdict = classifyPushDevice({
      latestStates: history.map((row) => row.state),
      lastRegisteredAt: device.lastRegisteredAt,
      now,
    });

    if (verdict === "keep") live.push(device);
    else gone.push({ device, verdict });
  }

  for (const { device, verdict } of gone.slice(0, MAX_REAPS_PER_SEND)) {
    // Device id and verdict only: never the token, never what was sent.
    console.log(`[push] reaping device ${device._id} (${verdict})`);
    await deletePushDevice(ctx, device._id);
  }

  return live;
}

/**
 * Send one logical notification to every device a profile has registered.
 *
 * Target resolution only — rate limiting and `notification_log` stay per
 * logical notification and happen before this is called, so one nudge remains
 * one rate-limit event and one log row regardless of device count.
 */
export async function sendPushToProfile(
  ctx: MutationCtx,
  args: {
    emotionalProfileId: Id<"emotional_profiles">;
    notification: Notification;
  },
): Promise<void> {
  const devices = await profilePushDevices(ctx, args.emotionalProfileId);

  // DEPRECATED(remove-after: app >= 1.9.0): profile-keyed fallback. A user who
  // has not relaunched since this deploy still has their token under the
  // profile-keyed recipient, and the nudge meant to bring them back is exactly
  // the one that must still reach them. Any registration retires that
  // recipient, so remove this once the supported version floor has passed.
  //
  // Decided on the pre-reap list deliberately. Reap first and a profile whose
  // last row just died would fall through to a profile-keyed recipient that
  // registration retired long ago.
  if (devices.length === 0) {
    await pushNotifications.sendPushNotification(ctx, {
      userId: args.emotionalProfileId,
      notification: args.notification,
      // The recipient may have preferences on and no token at all — never
      // opened the app on a physical device.
      allowUnregisteredTokens: true,
    });
    return;
  }

  const live = await reapDeadDevices(ctx, devices);

  // Everything this profile had is gone. Stop here rather than falling back:
  // these devices were registered, so the profile-keyed recipient above was
  // retired at that registration and there is nothing left to reach.
  if (live.length === 0) return;

  await pushNotifications.sendPushNotificationBatch(ctx, {
    notifications: live.map((device) => ({
      userId: device._id,
      notification: args.notification,
    })),
    allowUnregisteredTokens: true,
  });
}
