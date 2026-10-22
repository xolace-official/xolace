import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { cn } from '@/src/lib/cn';
import type { Slot } from './context';
import { RampKey } from './legend';

export interface HeatmapHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the grid is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — a period, a total, the held cell. */
  caption?: string;
  /**
   * Draw the ramp along the trailing edge, `Less ▢▢▢▢▢ More`. The key for a
   * grid that scrolls sideways, where `HeatmapChart.Legend` under the cells
   * would scroll away with them.
   */
  legend?: boolean;
  /** Text at the low end of the ramp, when `legend` is set. */
  lessLabel?: string;
  /** Text at the high end. */
  moreLabel?: string;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the grid: what the chart is of, what it currently reads, and
 * what the shading means.
 *
 * It belongs to the chart rather than to the card around it because it is about
 * the *grid* — the number changes as a finger moves across the cells, and the
 * ramp is the scale the chart itself derived. The card's header is a caption on
 * the tray the chart sits in; this is the chart introducing itself.
 *
 * The value is not derived here. Take it from `onActiveCellChange` and pass the
 * formatted string down, so one header can show a total when nothing is held
 * and a day's own count when something is.
 */
export function HeatmapHeader({
  className,
  title,
  value,
  caption,
  legend = false,
  lessLabel = 'Less',
  moreLabel = 'More',
  children,
  ...props
}: HeatmapHeaderProps) {
  const trailing =
    children ??
    (legend ? (
      <View className="flex-row items-center gap-1.5">
        <RampKey
          component="HeatmapChart.Header"
          // Small enough to sit on one line beside the text, whatever the cells are.
          size={(cell) => Math.max(Math.min(cell, 12), 8)}
          lessLabel={lessLabel}
          moreLabel={moreLabel}
        />
      </View>
    ) : null);

  return (
    <View
      {...props}
      className={cn('flex-row items-start justify-between gap-3 pb-3', className)}
    >
      <View className="flex-1 gap-0.5">
        {title ? (
          <Text size="xs" muted>
            {title}
          </Text>
        ) : null}
        {value ? (
          <Text size="xl" weight="bold">
            {value}
          </Text>
        ) : null}
        {caption ? (
          <Text size="xs" muted>
            {caption}
          </Text>
        ) : null}
      </View>
      {/* Shrinkable, unlike a view's default in React Native — held rigid, the
          ramp takes the width it wants and the caption wraps around it. */}
      {trailing ? <View className="shrink pt-1">{trailing}</View> : null}
    </View>
  );
}
HeatmapHeader.displayName = 'HeatmapChart.Header';
HeatmapHeader.slot = 'header' as Slot;
