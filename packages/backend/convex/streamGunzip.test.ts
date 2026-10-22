"use node";

import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { decompressWebhookBody, MAX_UNCOMPRESSED_BYTES } from "./streamGunzip";

const toArrayBuffer = (buf: Buffer): ArrayBuffer =>
  new Uint8Array(buf).buffer;

describe("decompressWebhookBody", () => {
  it("round-trips a real webhook payload", () => {
    const payload = JSON.stringify({ type: "message.new", channel_id: "c" });
    expect(decompressWebhookBody(toArrayBuffer(gzipSync(payload)))).toBe(
      payload,
    );
  });

  // The whole point of the cap: this compresses to a couple of KB on the wire
  // and would otherwise be decompressed in full, before any signature check.
  it("refuses a payload that expands past the cap", () => {
    const bomb = gzipSync(Buffer.alloc(MAX_UNCOMPRESSED_BYTES + 1, 0x61));
    expect(bomb.byteLength).toBeLessThan(64 * 1024);
    expect(() => decompressWebhookBody(toArrayBuffer(bomb))).toThrow();
  });
});
