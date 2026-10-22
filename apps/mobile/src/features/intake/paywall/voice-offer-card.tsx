/**
 * Card 1 of the offer deck — its own file because it is the only card that
 * does anything: it really plays the premium voices. The other three are
 * static miniatures and live together in `offer-cards.tsx`.
 */
import { View } from 'react-native';
import { PressableFeedback } from 'heroui-native';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import { OFFER_MASCOT, OfferCard } from '@/src/features/intake/paywall/offer-card';
import { useTokenColor } from '@/src/features/profile/hooks/use-token-color';
import { useVoicePreview } from '@/src/features/settings/hooks/use-voice-preview';
import { VOICE_OPTIONS } from '@/src/features/settings/voice-options';
import { playSoftPress } from '@/src/lib/haptics';

const PLAY = { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' } as const;
const STOP = { ios: 'stop.fill', android: 'stop', web: 'stop' } as const;

const PREMIUM_VOICES = VOICE_OPTIONS.filter((o) => o.premium && o.value !== 'auto');

/** Card 1 — the only interactive one. Hearing the voice is the whole sell. */
export function VoiceOfferCard({ width }: { width: number }) {
  const preview = useVoicePreview();
  const ink = useTokenColor('offer-ink');

  return (
    <OfferCard tag="Voices" title="Pick your Xolace voice" tint="witnessed" width={width} mascot={OFFER_MASCOT.voices}>
      {PREMIUM_VOICES.map((voice) => {
        const slug = voice.value as Exclude<typeof voice.value, 'auto'>;
        const playing = preview.playingSlug === slug;
        return (
          <PressableFeedback
            key={slug}
            accessibilityRole="button"
            accessibilityLabel={
              playing ? `Stop ${voice.label} preview` : `Play the ${voice.label} voice`
            }
            onPress={() => {
              playSoftPress();
              preview.toggle(slug);
            }}
            className="flex-row items-center gap-3 rounded-2xl bg-offer-ink/10 px-3.5 py-3"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-offer-ink/20">
              <SymbolView name={playing ? STOP : PLAY} size={14} tintColor={ink} />
            </View>
            <View className="flex-1">
              <AppText className="text-[15px] text-offer-ink font-[Poppins-Medium]">
                {voice.label}
              </AppText>
              <AppText numberOfLines={1} className="text-[12px] text-offer-ink/65 font-[Poppins-Regular]">
                {voice.description}
              </AppText>
            </View>
          </PressableFeedback>
        );
      })}
      <AppText className="text-[13px] leading-4.5 text-offer-ink/70 font-[Poppins-Regular]">
        Tap one; that&apos;s how your reflections get read back.
      </AppText>
    </OfferCard>
  );
}
