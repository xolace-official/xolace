import { View } from 'react-native';

import { AppText } from '@/src/components/shared/app-text';

import {
  FOUNDER_MESSAGE,
  RETURNING_CALLOUT,
  RETURNING_CALLOUT_LABEL,
  type AudienceKey,
  type Segment,
} from '@/src/features/intake/founder-message/letter-copy';

const PARAGRAPH_CLASS = 'text-foreground/80 text-[15px] leading-6.5 font-[Poppins-Regular]';

const renderSegments = (segments: Segment[]) =>
  segments.map((seg) =>
    seg.highlight ? (
      <AppText key={seg.text} className="text-accent font-[Poppins-Medium]">
        {seg.text}
      </AppText>
    ) : (
      seg.text
    )
  );

type Props = { audience: AudienceKey };

export const LetterBody = ({ audience }: Props) => (
  <View className="gap-4">
    {FOUNDER_MESSAGE.paragraphs.map((segments) => (
      <AppText key={segments[0].text} className={PARAGRAPH_CLASS}>
        {renderSegments(segments)}
      </AppText>
    ))}

    {audience === 'existing' ? (
      <View className="mt-1 rounded-2xl border-l-2 border-accent bg-accent/10 px-4 py-3">
        <AppText className="mb-1 text-[11px] uppercase tracking-widest text-accent/65 font-[Poppins-Medium]">
          {RETURNING_CALLOUT_LABEL}
        </AppText>
        <AppText className="text-foreground/85 text-[15px] leading-6 font-[Poppins-Regular]">
          {renderSegments(RETURNING_CALLOUT)}
        </AppText>
      </View>
    ) : null}

    <AppText className={PARAGRAPH_CLASS}>{FOUNDER_MESSAGE.transition}</AppText>

    <View className="pt-3">
      <AppText className="text-sm text-foreground/65 font-[Poppins-Regular]">
        {FOUNDER_MESSAGE.closing}
      </AppText>
      <AppText className="mt-1 text-[17px] tracking-wide text-foreground/55 font-[Poppins-Regular]">
        {FOUNDER_MESSAGE.signature}
      </AppText>
    </View>
  </View>
);
