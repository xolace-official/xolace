---
status: accepted
---

# A peer reflection carries a keyed author tag, not its contributor's ID

A contributor must never be shown their own peer reflection, so the server has to recognise one at match time. Each reflection stores an optional author tag: an HMAC of the contributor's `emotionalProfileId` under a per-deployment secret (`REFLECTION_AUTHOR_KEY`). At match time, `matchForSession`, the semantic precompute and `listRecent` compute the viewer's tag and drop rows that carry it. The tag never leaves the server: client and admin responses strip it.

This weakens the pool's anonymity claim from "untraceable even with full database access" to "untraceable without the author key." We accepted that because the old claim was already false. A session keeps `distilledText`, and the pool row's `displayText` is that same string, so anyone with database access could already link a session-sourced reflection to its author by matching the text.

## Considered options

- **Match on text at query time.** This adds no new data. But it misses follow-up shares, which are reworded before pooling, and it depends on the text leak. Fixing the leak would quietly break the filter.
- **The device remembers what it shared.** The server learns nothing. But the memory is lost on reinstall and on a second device.
- **Store the contributor's ID.** This gives up structural anonymity outright.

## Consequences

- **Never rotate the key.** A new key orphans every existing tag, and contributors start seeing their own reflections again.
- **A missing key fails open.** A reflection is pooled without a tag and the exclusion is skipped, with an error logged both times. Sharing never blocks on config.
- **Delete and re-signup starts fresh.** The person gets a new profile, so their old reflections can reach them again. Nothing links those reflections to the deleted account.
- **The backfill tagged only reflections from sessions.** It matched the text against their source sessions. Follow-up shares pooled before the tag existed stay untagged.
