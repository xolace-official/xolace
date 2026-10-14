import { forwardRef, useMemo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { EaseView } from 'react-native-ease';
import { useReducedMotion } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { ChartAccessibilityData } from '@/src/components/ui/chart-accessibility';
import { cn } from '@/src/lib/cn';
import { DAYS_IN_WEEK, DEFAULT_AXIS_WIDTH } from './constants';
import { HeatmapContext, type HeatmapContextValue } from './context';
import { splitParts } from './parts';
import type { HeatmapChartProps } from './props';
import { useHeatmapModel } from './use-heatmap-model';

export const HeatmapChartRoot = forwardRef<View, HeatmapChartProps>(function HeatmapChartRoot(
  {
    className,
    data,
    layout = 'fluid',
    binSize = 12,
    gap = 3,
    cornerRadius = 2,
    weekStartDay = 0,
    rows = DAYS_IN_WEEK,
    levels,
    levelColors,
    color,
    emptyColor,
    levelOpacity,
    animationDuration = 900,
    inactiveOpacity = 1,
    onActiveCellChange,
    accessible,
    accessibilityLabel,
    accessibilityHint,
    accessibilityLabelForDatum,
    onAccessibilityDatumPress,
    children,
    ...props
  },
  ref
) {  const parts = useMemo(() => splitParts(children), [children]);
  // The y-axis is laid out beside the grid rather than over it, so its width
  // has to come out of the grid's before the cells are sized.
  const axisWidth = parts.y ? (parts.y.props.width ?? DEFAULT_AXIS_WIDTH) : 0;

  const {
    setWidth,
    grid,
    ramp,
    opacities,
    levelOf,
    cellAt,
    accessibilityCells,
    activeCell,
    setActiveCell,
  } = useHeatmapModel({
    data,
    layout,
    binSize,
    gap,
    rows,
    levels,
    levelColors,
    color,
    emptyColor,
    levelOpacity,
    onActiveCellChange,
    axisWidth,
  });
  const reducedMotion = useReducedMotion();

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
    props.onLayout?.(event);
  };

  const context = useMemo<HeatmapContextValue>(
    () => ({
      data,
      grid,
      ramp,
      opacities,
      levelOf,
      cellAt,
      cornerRadius,
      inactiveOpacity,
      weekStartDay,
      activeCell,
      setActiveCell,
    }),
    [
      data,
      grid,
      ramp,
      opacities,
      levelOf,
      cellAt,
      cornerRadius,
      inactiveOpacity,
      weekStartDay,
      activeCell,
      setActiveCell,
    ]
  );

  return (
    <HeatmapContext.Provider value={context}>
      <View
        {...props}
        ref={ref}
        onLayout={onLayout}
        className={cn('w-full', className)}
      >
        {/* Above the axis gutter as well as the grid: the header is about the
            whole chart, so it starts at the chart's edge, not the grid's. */}
        {parts.header}

        <ChartAccessibilityData
          chart="Heatmap chart"
          data={accessibilityCells}
          disabled={accessible === false}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityLabelForDatum={accessibilityLabelForDatum}
          onAccessibilityDatumPress={onAccessibilityDatumPress}
          valueOf={(cell) => [
            ['date', cell.date],
            ['column', cell.column],
            ['row', cell.row],
            ['count', cell.count],
          ]}
        />

        {parts.x ? (
          <View
            style={{ paddingLeft: axisWidth }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {parts.x}
          </View>
        ) : null}

        <View
          className="flex-row"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {parts.y}
          <View style={{ width: grid.width, height: grid.height }}>
            {grid.width > 0 ? (
              <>
                {/*
                 * A native fade, not a Reanimated clip. The grid used to sit
                 * in a view whose width animated from 0, and on some TestFlight
                 * devices that animation never landed, so it stayed at 0 and
                 * the grid never showed. A missed fade still ends at opacity 1,
                 * so the grid can't stay hidden.
                 */}
                <EaseView
                  pointerEvents="none"
                  initialAnimate={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'timing', duration: reducedMotion ? 0 : animationDuration, easing: 'easeOut' }}
                  style={StyleSheet.absoluteFill}
                >
                  <Svg width={grid.width} height={grid.height}>
                    {parts.rules}
                    {parts.cells}
                  </Svg>
                </EaseView>
                {parts.tooltip}
              </>
            ) : null}
          </View>
        </View>

        {parts.legend}
      </View>
    </HeatmapContext.Provider>
  );
});
