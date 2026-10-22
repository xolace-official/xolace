import { describe, expect, it } from "vitest";
import {
  chatNotificationContent,
  chatNotificationRoute,
  chatNotificationsAllowed,
  conversationIdFromChannelId,
  isChatNotificationType,
  MESSAGE_NOTIFICATION_WINDOW_MS,
  messageNotificationRecipient,
  messageNotificationSuppressed,
  messageNotifiedField,
  xolacerChannelId,
} from "./chatNotifications";

describe("chatNotificationContent", () => {
  it("puts the counterpart's pseudonym in the title, not the body", () => {
    const content = chatNotificationContent("chat_request", "Camper 4F2A");
    expect(content.title).toBe("Camper 4F2A");
    expect(content.body).not.toContain("Camper 4F2A");
  });

  // A seeker knows their xolacer by display name, never by a pseudonym — the
  // caller passes whichever name the recipient already sees elsewhere.
  it("titles an accept with the xolacer's name", () => {
    const content = chatNotificationContent("chat_accepted", "River");
    expect(content.title).toBe("River");
    expect(content.body).toBe("Has space for you, your conversation is open");
  });

  // The exception to pseudonym-as-title: being turned down should not be the
  // loudest thing on a lock screen, and the copy ends on an option. The name
  // is not sent at all, so this holds however the caller is written.
  it("keeps Xolace as the title for a decline and names nobody", () => {
    const content = chatNotificationContent("chat_declined");
    expect(content.title).toBe("Xolace");
    expect(content.body).toBe(
      "That conversation didn't open. Other xolacers are available.",
    );
    expect(chatNotificationContent("chat_declined", "Camper 4F2A")).toEqual(
      content,
    );
  });

  // Nobody refused anything here — the request simply ran out of time. The
  // copy has to blame neither side and end on the roster, and like a decline it
  // never names the xolacer who went quiet.
  it("keeps Xolace as the title for an expiry and names nobody", () => {
    const content = chatNotificationContent("chat_expired");
    expect(content.title).toBe("Xolace");
    expect(chatNotificationContent("chat_expired", "River")).toEqual(content);
  });

  it("titles a message with the sender's name and says only that one arrived", () => {
    const content = chatNotificationContent("chat_message", "Camper 4F2A");
    expect(content.title).toBe("Camper 4F2A");
    expect(content.body).toBe("Sent you a message");
  });
});

describe("chatNotificationRoute", () => {
  const conversationId = "k17abc";
  const tappedAt = 1_754_600_000_000;

  // A xolacer who was browsing the roster has `selected` stuck there, so the
  // segment has to be named rather than left to the tab's auto-select.
  it("routes a request to the chats list", () => {
    expect(
      chatNotificationRoute("chat_request", conversationId, tappedAt),
    ).toEqual({
      pathname: "/connect",
      params: { view: "chats", t: String(tappedAt) },
    });
  });

  it("routes an accept into the conversation thread", () => {
    expect(
      chatNotificationRoute("chat_accepted", conversationId, tappedAt),
    ).toEqual({
      pathname: "/chat/[conversationId]",
      params: { conversationId },
    });
  });

  it("routes a message into the conversation thread", () => {
    expect(
      chatNotificationRoute("chat_message", conversationId, tappedAt),
    ).toEqual({
      pathname: "/chat/[conversationId]",
      params: { conversationId },
    });
  });

  // The seeker owns the declined row, so a bare /connect would auto-select
  // Chats and land them back on the dead conversation.
  it("routes a decline to the roster, not the dead conversation", () => {
    const route = chatNotificationRoute(
      "chat_declined",
      conversationId,
      tappedAt,
    );
    expect(route).toEqual({
      pathname: "/connect",
      params: { view: "xolacers", t: String(tappedAt) },
    });
    expect(JSON.stringify(route)).not.toContain(conversationId);
  });

  // Same reason as a decline: the seeker owns the expired row, so /connect
  // would auto-select Chats and drop them back on the conversation that just
  // closed instead of the roster the copy just pointed them at.
  it("routes an expiry to the roster, not the dead conversation", () => {
    const route = chatNotificationRoute(
      "chat_expired",
      conversationId,
      tappedAt,
    );
    expect(route).toEqual({
      pathname: "/connect",
      params: { view: "xolacers", t: String(tappedAt) },
    });
    expect(JSON.stringify(route)).not.toContain(conversationId);
  });

  // Two taps must be two arrivals: the Connect tab stays mounted and compares
  // params, so identical ones read as no navigation.
  it("distinguishes a second tap from the first", () => {
    const first = chatNotificationRoute("chat_declined", conversationId, 1);
    const second = chatNotificationRoute("chat_declined", conversationId, 2);
    expect(first.params.t).not.toBe(second.params.t);
  });
});

describe("isChatNotificationType", () => {
  // The nudge types share the `data.type` field and must not route here.
  it("rejects nudge types and junk", () => {
    expect(isChatNotificationType("gentle_return")).toBe(false);
    expect(isChatNotificationType(undefined)).toBe(false);
  });
});

describe("chatNotificationsAllowed", () => {
  // Absent is the shape of every preferences row written before the chat
  // preference existed; those users must still be reachable.
  it("allows when the chat preference is absent", () => {
    expect(chatNotificationsAllowed({ enabled: true })).toBe(true);
  });

  it("allows when the chat preference is explicitly true", () => {
    expect(chatNotificationsAllowed({ enabled: true, chat: true })).toBe(true);
  });

  it("suppresses when the chat preference is explicitly false", () => {
    expect(chatNotificationsAllowed({ enabled: true, chat: false })).toBe(false);
  });

  // The master switch means what it says, whatever the chat toggle reads.
  it("suppresses when the master switch is off", () => {
    expect(chatNotificationsAllowed({ enabled: false, chat: true })).toBe(false);
  });

  it("suppresses when there is no preferences row", () => {
    expect(chatNotificationsAllowed(null)).toBe(false);
    expect(chatNotificationsAllowed(undefined)).toBe(false);
  });
});

describe("conversationIdFromChannelId", () => {
  const conversationId = "k17abc";

  it("round-trips the id the accept path writes", () => {
    expect(conversationIdFromChannelId(xolacerChannelId(conversationId))).toBe(
      conversationId,
    );
  });

  // The webhook is a public endpoint; every one of these is something a
  // forged or off-product payload can put in the channel_id field.
  it("drops anything that is not one of our channel ids", () => {
    expect(conversationIdFromChannelId("messaging:xolacer_k17abc")).toBeNull();
    expect(conversationIdFromChannelId("support_k17abc")).toBeNull();
    expect(conversationIdFromChannelId("xolacer_")).toBeNull();
    expect(conversationIdFromChannelId("")).toBeNull();
    expect(conversationIdFromChannelId(undefined)).toBeNull();
    expect(conversationIdFromChannelId(42)).toBeNull();
  });
});

describe("messageNotificationRecipient", () => {
  const conversation = {
    userProfileId: "seeker1",
    xolacerProfileId: "xolacer1",
  };

  it("notifies the xolacer when the seeker sent it", () => {
    expect(messageNotificationRecipient(conversation, "seeker1")).toBe(
      "xolacer1",
    );
  });

  it("notifies the seeker when the xolacer sent it", () => {
    expect(messageNotificationRecipient(conversation, "xolacer1")).toBe(
      "seeker1",
    );
  });

  // The forged-payload case: a stranger named as the sender addresses nobody,
  // rather than addressing whichever participant happens to be listed first.
  it("drops a sender who is not on this row", () => {
    expect(messageNotificationRecipient(conversation, "stranger")).toBeNull();
    expect(messageNotificationRecipient(conversation, undefined)).toBeNull();
  });
});

describe("messageNotificationSuppressed", () => {
  const now = 1_754_600_000_000;

  it("lets the first message in a conversation through", () => {
    expect(messageNotificationSuppressed(undefined, now)).toBe(false);
  });

  it("suppresses a burst inside the window", () => {
    expect(messageNotificationSuppressed(now, now)).toBe(true);
    expect(messageNotificationSuppressed(now - 1_000, now)).toBe(true);
    expect(
      messageNotificationSuppressed(
        now - (MESSAGE_NOTIFICATION_WINDOW_MS - 1),
        now,
      ),
    ).toBe(true);
  });

  it("notifies again once the window has passed", () => {
    expect(
      messageNotificationSuppressed(now - MESSAGE_NOTIFICATION_WINDOW_MS, now),
    ).toBe(false);
    expect(
      messageNotificationSuppressed(
        now - MESSAGE_NOTIFICATION_WINDOW_MS - 1,
        now,
      ),
    ).toBe(false);
  });
});

describe("messageNotifiedField", () => {
  const conversation = {
    userProfileId: "seeker1",
    xolacerProfileId: "xolacer1",
  };

  it("gives each participant their own stamp", () => {
    expect(messageNotifiedField(conversation, "seeker1")).toBe(
      "lastNotifiedUserAt",
    );
    expect(messageNotifiedField(conversation, "xolacer1")).toBe(
      "lastNotifiedXolacerAt",
    );
  });

  // The regression this split exists for: with one stamp on the row, the
  // seeker's own message opened a window that then swallowed the reply to it —
  // message-then-reply, the ordinary shape of a chat, going silent.
  it("does not let a message silence the reply to it", () => {
    const now = 1_754_600_000_000;
    const row: {
      userProfileId: string;
      xolacerProfileId: string;
      lastNotifiedUserAt?: number;
      lastNotifiedXolacerAt?: number;
    } = { ...conversation };

    // Seeker writes at T0 — the xolacer is told, and their stamp is set.
    const toXolacer = messageNotificationRecipient(row, "seeker1")!;
    const xolacerField = messageNotifiedField(row, toXolacer);
    expect(messageNotificationSuppressed(row[xolacerField], now)).toBe(false);
    row[xolacerField] = now;

    // Xolacer replies 45s later, well inside the window the seeker's own
    // message opened. The seeker is still told.
    const toSeeker = messageNotificationRecipient(row, "xolacer1")!;
    const seekerField = messageNotifiedField(row, toSeeker);
    expect(seekerField).not.toBe(xolacerField);
    expect(messageNotificationSuppressed(row[seekerField], now + 45_000)).toBe(
      false,
    );
  });

  // The half that must keep working: one person typing four thoughts in a row
  // is still one buzz for the person reading them.
  it("still suppresses a burst from the same sender", () => {
    const now = 1_754_600_000_000;
    const row: {
      userProfileId: string;
      xolacerProfileId: string;
      lastNotifiedUserAt?: number;
      lastNotifiedXolacerAt?: number;
    } = { ...conversation, lastNotifiedXolacerAt: now };
    const field = messageNotifiedField(row, "xolacer1");
    expect(messageNotificationSuppressed(row[field], now + 30_000)).toBe(true);
  });
});
