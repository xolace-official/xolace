/**
 * Lantern instrumentation (#416). Every Library event lives here, in its own
 * `library_*` namespace (not `browse_*`, #399). Reading is coarse on purpose:
 * opened and finished, no scroll depth.
 */
import type { PostHog } from 'posthog-react-native';

import type { Twig } from '@/src/features/kindling/twig-presentation';
import type { Kind } from '@/src/features/library/home/library-copy';

/**
 * Where a reader open came from. Every way in sets it, the share sheet's link
 * included; a link that forgets it lands as `unknown` so the gap shows.
 * `today` is reserved for Tonight's reading, which has no surface yet;
 * `next` is the Up next card at the end of a read (#417); `continue` is the
 * home's Continue reading card (#420).
 */
export type ReaderFrom = 'twig' | 'home' | 'hub' | 'kind' | 'subject' | 'share' | 'today' | 'next' | 'continue' | 'search' | 'unknown';

type Entry = { slug: string };

type LibraryEvents = {
  // Navigation (#409)
  library_home_opened: undefined;
  library_hub_opened: { hub: string };
  library_kind_opened: { kind: Kind };
  library_subject_opened: { subject: string };
  library_subjects_opened: { letter: string | null };
  // Reading funnel (#407, #410)
  library_entry_opened: Entry & { from: ReaderFrom };
  library_entry_finished: Entry; // by reading or by hearing the full audio
  library_entry_helped: Entry & { helped: boolean };
  library_entry_shared: Entry;
  library_reflect_started: Entry & { curated: boolean };
  // Audio (#411)
  library_audio_played: Entry & { preview: boolean };
  library_audio_preview_ended: Entry;
  library_audio_completed: Entry;
  // Paywall, paired
  library_paywall_shown: Entry & { trigger: 'audio_preview' };
  library_paywall_tapped: Entry & { trigger: 'audio_preview' };
  // Read twig (#412); its open is `library_entry_opened{from:'twig'}`
  library_twig_shown: Entry & { state: Twig['state'] };
};

export function trackLibrary<E extends keyof LibraryEvents>(
  posthog: PostHog,
  event: E,
  ...props: LibraryEvents[E] extends undefined ? [] : [LibraryEvents[E]]
) {
  posthog.capture(event, props[0]);
}
