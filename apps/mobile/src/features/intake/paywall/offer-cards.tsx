/**
 * Four of the five offers on the intake deck, each drawn as the thing itself
 * rather than as an illustration of it — miniatures of the surfaces they
 * unlock. The fifth, the voice card, is interactive and lives in
 * `voice-offer-card.tsx`.
 *
 * Five is the cap. A sixth card is a sixth thing to weigh at the exact moment
 * the user is deciding whether any of it is for them.
 */
import { View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import { OFFER_MASCOT, OfferCard, OfferMock, OfferPill } from '@/src/features/intake/paywall/offer-card';
import { useTokenColor } from '@/src/features/profile/hooks/use-token-color';
import { cn } from '@/src/lib/utils';

const MUSIC_NOTE = { ios: 'music.note', android: 'music_note', web: 'music_note' } as const;
const WIND = { ios: 'wind', android: 'air', web: 'air' } as const;
const PEOPLE = { ios: 'person.2.fill', android: 'group', web: 'group' } as const;
const CHECK = { ios: 'checkmark', android: 'check', web: 'check' } as const;
const kindlingMascot = require('@/assets/images/flux/flux-curiosity.png');

// Real twig copy (kindling/twig-presentation.ts), not placeholder text — the
// first is always the just-finished breathing step, done; the next two are
// what a path actually hands off to next.
const KINDLING_STEPS = [
  { symbol: WIND, title: 'Sit with this', done: true },
  { symbol: MUSIC_NOTE, title: 'Low sound for the quiet', done: false },
  { symbol: PEOPLE, title: 'Someone who has been here', done: false },
] as const;

/** A step row inside the mini rail — done steps get a filled check, the rest a plain glyph. */
function KindlingStepRow({ symbol, title, done }: { symbol: SymbolViewProps['name']; title: string; done: boolean }) {
  // `--offer-ink` is deliberately theme-invariant and always dark (see
  // offer-card.tsx) — a done step's check always needs a light glyph on it.
  const ink = useTokenColor('offer-ink');
  return (
    <View className="flex-row items-center gap-2.5">
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-offer-ink' : 'bg-offer-ink/12'}`}
      >
        <SymbolView name={done ? CHECK : symbol} size={12} tintColor={done ? '#fff' : ink} />
      </View>
      <AppText
        className={`flex-1 text-[13.5px] font-[Poppins-Medium] ${done ? 'text-offer-ink/45 line-through' : 'text-offer-ink'}`}
      >
        {title}
      </AppText>
    </View>
  );
}

/**
 * Card 5 — Kindling & Browse. Two distinct panels in one card: Kindling's
 * step rail (checkmark/step circles) and Browse's playback rows, each
 * keeping its own icon language so the panel boundary reads as "these are
 * two things," not just a gap between them.
 */
export function KindlingBrowseOfferCard({ width }: { width: number }) {
  const ink = useTokenColor('offer-ink');
  return (
    <OfferCard tag="Kindling & Browse" title="What next, after clarity?" tint="topics" width={width} mascot={kindlingMascot}>
      <View className="flex-1 justify-center gap-4">
        <OfferMock className="gap-2.5">
          <AppText className="text-[11px] uppercase tracking-widest text-offer-ink/50 font-[Poppins-Medium]">
            Kindling · next up
          </AppText>
          {KINDLING_STEPS.map((s) => (
            <KindlingStepRow key={s.title} {...s} />
          ))}
        </OfferMock>
        <OfferMock className="gap-3">
          <AppText className="text-[11px] uppercase tracking-widest text-offer-ink/50 font-[Poppins-Medium]">
            Browse
          </AppText>
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-offer-ink/15">
              <SymbolView name={{ ios: 'pause.fill', android: 'pause', web: 'pause' }} size={12} tintColor={ink} />
            </View>
            <View className="flex-1">
              <AppText className="text-[14px] text-offer-ink font-[Poppins-Medium]">Low sound for the quiet</AppText>
              <AppText className="text-[12px] text-offer-ink/60 font-[Poppins-Regular]">Music · looping</AppText>
            </View>
          </View>
          <View className="h-px bg-offer-ink/12" />
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-offer-ink/15">
              <SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={12} tintColor={ink} />
            </View>
            <View className="flex-1">
              <AppText className="text-[14px] text-offer-ink font-[Poppins-Medium]">A voice for this</AppText>
              <AppText className="text-[12px] text-offer-ink/60 font-[Poppins-Regular]">Support audio · 8 min</AppText>
            </View>
          </View>
        </OfferMock>
      </View>
    </OfferCard>
  );
}


/** Card 2 — Xolacers. Two bubbles is the product; anything more is decoration. */
export function XolacersOfferCard({ width }: { width: number }) {
  return (
    <OfferCard tag="Xolacers" title="Talk to someone who gets it" tint="gentle" width={width} mascot={OFFER_MASCOT.xolacers}>
      <OfferMock>
        <View className="self-start rounded-2xl rounded-bl-md bg-offer-ink/10 px-3.5 py-2.5">
          <AppText className="text-[14px] leading-[19px] text-offer-ink font-[Poppins-Regular]">
            Sunday nights are the worst.
          </AppText>
        </View>
        <View className="self-end rounded-2xl rounded-br-md bg-offer-ink/[0.18] px-3.5 py-2.5">
          <AppText className="text-[14px] leading-[19px] text-offer-ink font-[Poppins-Regular]">
            Same. Mine start around 6.
          </AppText>
        </View>
        <View className="self-start rounded-2xl rounded-bl-md bg-offer-ink/10 px-3.5 py-2.5">
          <AppText className="text-[14px] leading-[19px] text-offer-ink font-[Poppins-Regular]">
            How do you get through it?
          </AppText>
        </View>
        <View className="self-end rounded-2xl rounded-br-md bg-offer-ink/[0.18] px-3.5 py-2.5">
          <AppText className="text-[14px] leading-[19px] text-offer-ink font-[Poppins-Regular]">
            Honestly? Saying it out loud.
          </AppText>
        </View>
        {/* Someone is still there — the one thing a static mock can say about
            a live conversation. */}
        <View className="self-start flex-row gap-1.5 rounded-2xl rounded-bl-md bg-offer-ink/10 px-3.5 py-3.5">
          <View className="h-1.5 w-1.5 rounded-full bg-offer-ink/40" />
          <View className="h-1.5 w-1.5 rounded-full bg-offer-ink/40" />
          <View className="h-1.5 w-1.5 rounded-full bg-offer-ink/40" />
        </View>
      </OfferMock>
      <AppText className="text-[13px] leading-[18px] text-offer-ink/70 font-[Poppins-Regular]">
        Matched on what you&apos;re carrying. No names, no profiles.
      </AppText>
    </OfferCard>
  );
}

/**
 * Card 3 — insights. Two panels because Plus ships two of them: the week's
 * intensity history and the words/language map (`TeaserFeature` in
 * use-insight-gate.ts). One panel would sell insights as a word cloud.
 */
const WEEK = [
  { day: 'M', level: 'h-2.5 opacity-30' },
  { day: 'T', level: 'h-5 opacity-55' },
  { day: 'W', level: 'h-4 opacity-45' },
  { day: 'T', level: 'h-8 opacity-95' },
  { day: 'F', level: 'h-6 opacity-70' },
  { day: 'S', level: 'h-3 opacity-35' },
  { day: 'S', level: 'h-7 opacity-85' },
];

export function InsightsOfferCard({ width }: { width: number }) {
  return (
    <OfferCard tag="Insights" title="See what keeps coming back" tint="poetic" width={width} mascot={OFFER_MASCOT.insights}>
      <OfferMock>
        <AppText className="text-[12px] uppercase tracking-widest text-offer-ink/50 font-[Poppins-Medium]">
          This week
        </AppText>
        {/* Seven days, one block each — how heavy the day ran. Blocks, not a
            plotted line: this is a week, not a trend. */}
        <View className="flex-row items-end justify-between pt-0.5">
          {WEEK.map((d, i) => (
            <View key={`${d.day}-${i}`} className="items-center gap-1.5">
              <View className={cn('w-6 rounded-md bg-offer-ink', d.level)} />
              <AppText className="text-[11px] text-offer-ink/50 font-[Poppins-Medium]">
                {d.day}
              </AppText>
            </View>
          ))}
        </View>
        <AppText className="pt-1 text-[13px] leading-[18px] text-offer-ink/70 font-[Poppins-Regular]">
          Thursdays run heaviest — four weeks straight.
        </AppText>
      </OfferMock>

      <OfferMock>
        <AppText className="text-[15px] leading-[21px] text-offer-ink font-[Poppins-Medium]">
          Work came up in 7 of your last 9 reflections.
        </AppText>
        <View className="flex-row flex-wrap gap-2">
          <OfferPill>Work</OfferPill>
          <OfferPill>Sunday</OfferPill>
          <OfferPill>Tired</OfferPill>
        </View>
      </OfferMock>
      <AppText className="text-[13px] leading-[18px] text-offer-ink/70 font-[Poppins-Regular]">
        And more the longer you keep going.
      </AppText>
    </OfferCard>
  );
}

/**
 * The rest of Plus in one table — the caps it lifts, and the two things it
 * swaps from generic to yours (quotes and mirror tone). The `free` column is
 * struck through, so every row has to read as a real before/after.
 */
const CAPS = [
  { label: 'Reflections', free: '3 an hour', plus: 'No cap' },
  { label: 'Voice vents', free: '1 a day', plus: 'No cap' },
  { label: 'Timeline', free: '30 days', plus: 'All of it' },
  { label: 'Daily quotes', free: 'Generic', plus: 'Your words' },
  { label: 'Mirror tone', free: 'Auto', plus: 'You pick' },
];

/** Card 4 — the ceiling, lifted. Shows the actual numbers it lifts. */
export function LimitsOfferCard({ width }: { width: number }) {
  return (
    <OfferCard tag="Everything else" title="And the ceiling comes off" tint="direct" width={width} mascot={OFFER_MASCOT.limits}>
      <OfferMock className="gap-0 py-1">
        <View className="flex-row items-center pt-1.5 pb-0.5">
          <View className="flex-1" />
          <AppText className="text-[11px] uppercase tracking-wider text-offer-ink/45 font-[Poppins-Medium]">
            Free
          </AppText>
          <AppText className="w-[98px] pl-2 text-[11px] uppercase tracking-wider text-offer-ink/70 font-[Poppins-Medium]">
            Plus
          </AppText>
        </View>
        {CAPS.map((row) => (
          <View key={row.label} className="flex-row items-center py-3">
            <AppText className="flex-1 text-[14px] text-offer-ink/70 font-[Poppins-Regular]">
              {row.label}
            </AppText>
            <AppText className="text-[14px] text-offer-ink/40 line-through font-[Poppins-Regular]">
              {row.free}
            </AppText>
            <AppText className="w-[98px] pl-2 text-[14px] text-offer-ink font-[Poppins-SemiBold]">
              {row.plus}
            </AppText>
          </View>
        ))}
      </OfferMock>
      <AppText className="text-[13px] leading-[18px] text-offer-ink/70 font-[Poppins-Regular]">
        Nothing is taken away; the lid just comes off.
      </AppText>
    </OfferCard>
  );
}
