import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { EPISODIC_PURGE_HELPERS } from "../episodicMemory";
import { SESSION_CASCADE_TABLES, SESSION_ID_EXEMPT } from "./sessionCascade";

/**
 * The guard that makes lib/sessionCascade the single owner of the session
 * reference graph: every table carrying a `sessionId` must be either purged
 * by purgeSessions or explicitly exempted with a reason.
 *
 * This is the test that would have caught `follow_up_cards` — added to the
 * schema, wired into dataWipe and accountDeletion, silently forgotten by
 * dataRetention, leaving orphan cards pointing at deleted sessions.
 */
function tablesWithSessionId(): string[] {
  const found = new Set<string>();
  // Direct: a `sessionId` field. Transitive: a `v.id()` field pointing at a
  // table already in the set (`path_steps.pathId` → `paths.sessionId`).
  // Iterate to a fixpoint so a chain of any depth is caught.
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, table] of Object.entries(schema.tables)) {
      if (found.has(name)) continue;
      // validator.fields is the object validator's field map for a defineTable.
      const fields: Record<string, any> = (table as any).validator?.fields ?? {};
      const references =
        "sessionId" in fields ||
        Object.values(fields).some(
          (f) => f?.kind === "id" && found.has(f.tableName),
        );
      if (references) {
        found.add(name);
        grew = true;
      }
    }
  }
  return [...found].sort();
}

describe("session cascade reference graph", () => {
  it("classifies every table that references a session", () => {
    const classified = [
      ...SESSION_CASCADE_TABLES,
      ...Object.keys(SESSION_ID_EXEMPT),
    ].sort();

    expect(tablesWithSessionId()).toEqual(classified);
  });

  it("finds a non-trivial set (guards against a broken schema walk)", () => {
    // If introspection silently returns [], the assertion above would pass
    // only when both lists are empty — which they never are.
    expect(tablesWithSessionId().length).toBeGreaterThanOrEqual(5);
  });

  it("never both purges and exempts the same table", () => {
    for (const table of SESSION_CASCADE_TABLES) {
      expect(Object.keys(SESSION_ID_EXEMPT)).not.toContain(table);
    }
  });
});

/**
 * The same invariant one level down, for the vector store: an episodic key
 * class whose purge helper is never called leaves embeddings alive after the
 * rows that produced them are gone. Two classes exist now (sessions, and
 * quote replies — ADR 0007), and neither wipe loop touches a vector on its
 * own, so "there is a helper" is not the same fact as "something calls it".
 */
function deletionSources(): string[] {
  const roots = [
    path.resolve(process.cwd(), "convex/jobs"),
    path.resolve(process.cwd(), "convex/lib"),
  ];
  const files: string[] = [];
  for (const root of roots) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      if (entry.name.endsWith(".test.ts")) continue;
      files.push(path.join(root, entry.name));
    }
  }
  return files;
}

describe("episodic key classes", () => {
  const sources = deletionSources().map((f) => fs.readFileSync(f, "utf8"));

  it("finds the deletion sources (guards against a broken file walk)", () => {
    expect(sources.length).toBeGreaterThanOrEqual(5);
  });

  // Profile-keyed, not session-keyed, so the schema walk above can't see it
  // (ADR 0020): wipe and account deletion drop every row, retention the
  // closed ones past cutoff. Behaviour is in compounding/stretches.test.ts.
  it.each(["dataWipe.ts", "dataRetention.ts", "accountDeletionSteps.ts"])(
    "%s deletes compounding stretches",
    (file) => {
      const src = fs.readFileSync(path.resolve(process.cwd(), "convex/jobs", file), "utf8");
      expect(src).toContain(`ctx.db.delete("compounding_stretches"`);
    },
  );

  it.each(Object.entries(EPISODIC_PURGE_HELPERS))(
    "purges the %s key class from a deletion job",
    (_keyClass, helper) => {
      const callers = sources.filter((src) => src.includes(`${helper}(`));
      expect(callers.length).toBeGreaterThan(0);
    },
  );
});

/**
 * Compounding and safeguard are separate axes with no cross-feed (#489):
 * safeguard watches the present moment, compounding one domain over weeks,
 * and neither reads the other. Crisis sessions still count as readings
 * (compounding/stretches.test.ts).
 */
describe("compounding ⟂ safeguard", () => {
  const src = (file: string) => fs.readFileSync(path.resolve(process.cwd(), "convex", file), "utf8");

  it("safeguard never reads compounding", () => {
    expect(src("ai/safeguard.ts")).not.toMatch(/compounding/i);
  });

  it.each(["compounding/detect.ts", "compounding/stretches.ts", "compounding/readings.ts"])(
    "%s never reads or writes safeguard state",
    (file) => {
      expect(src(file)).not.toMatch(/\.riskFlag|\.safeguardLevel|evaluateSafeguard|escalation_events/);
    },
  );
});
