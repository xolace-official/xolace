import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Text } from '@/src/components/ui/text';
import { cn } from '@/src/lib/cn';
import { useHeatmap, type Slot } from './context';

/** `Less ▢▢▢▢▢ More` — the ramp as swatches. Shared by the legend and the header. */
export function RampKey({
  component,
  size,
  lessLabel,
  moreLabel,
}: {
  component: string;
  size: (cellSize: number) => number;
  lessLabel: string;
  moreLabel: string;
}) {
  const { ramp, opacities, grid, cornerRadius } = useHeatmap(component);
  const side = size(grid.size);

  return (
    <>
      <Text size="xs" muted>
        {lessLabel}
      </Text>
      {ramp.map((fill, level) => (
        // The index *is* the level — a fixed five-slot ramp, never reordered.
        // eslint-disable-next-line react/no-array-index-key
        <Svg key={level} width={side} height={side}>
          <Rect
            x={0}
            y={0}
            width={side}
            height={side}
            rx={cornerRadius}
            ry={cornerRadius}
            fill={fill}
            fillOpacity={opacities[level]}
          />
        </Svg>
      ))}
      <Text size="xs" muted>
        {moreLabel}
      </Text>
    </>
  );
}

export interface HeatmapLegendProps {
  className?: string;
  /** Text at the low end of the ramp. */
  lessLabel?: string;
  /** Text at the high end. */
  moreLabel?: string;
  /** Side of a swatch, in pixels. Defaults to the chart's cell size. */
  swatchSize?: number;
}

/** The `Less ▢▢▢▢▢ More` key, under the grid. */
export function HeatmapLegend({
  className,
  lessLabel = 'Less',
  moreLabel = 'More',
  swatchSize,
}: HeatmapLegendProps) {
  return (
    <View className={cn('flex-row items-center gap-1.5 pt-2', className)}>
      <View className="flex-1" />
      <RampKey
        component="HeatmapChart.Legend"
        size={(cell) => swatchSize ?? Math.max(cell, 10)}
        lessLabel={lessLabel}
        moreLabel={moreLabel}
      />
    </View>
  );
}
HeatmapLegend.slot = 'legend' as Slot;
