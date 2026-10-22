import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ensureStreamUsers } from "../integrations/stream";

const calls: { method: string; url: URL; body: unknown }[] = [];

beforeEach(() => {
  process.env.STREAM_API_KEY = "k";
  process.env.STREAM_API_SECRET = "s";
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const u = new URL(url);
      calls.push({ method: init.method!, url: u, body: init.body ? JSON.parse(init.body as string) : undefined });
      if (init.method === "GET") {
        const ids: string[] = JSON.parse(u.searchParams.get("payload")!).filter_conditions.id.$in;
        // every even-indexed id already exists
        return new Response(JSON.stringify({ users: ids.filter((_, i) => i % 2 === 0).map((id) => ({ id })) }));
      }
      return new Response("{}");
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

test("ensureStreamUsers chunks the lookup by 100 and upserts only unknown ids", async () => {
  const users = Array.from({ length: 150 }, (_, i) => ({ id: `u${i}`, name: "Camper" }));
  await ensureStreamUsers(users);

  const gets = calls.filter((c) => c.method === "GET");
  const posts = calls.filter((c) => c.method === "POST");
  expect(gets).toHaveLength(2);
  expect(posts).toHaveLength(1);
  const upserted = Object.keys((posts[0].body as { users: Record<string, unknown> }).users);
  expect(upserted).toHaveLength(75);
  expect(upserted).not.toContain("u0");
  expect(upserted).toContain("u1");
});

test("ensureStreamUsers skips the upsert when every id exists", async () => {
  await ensureStreamUsers([{ id: "u0", name: "Camper" }]);
  expect(calls.map((c) => c.method)).toEqual(["GET"]);
});
