import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Text } from '@/src/components/ui/text';
import { cn } from '@/src/lib/cn';
import { DEFAULT_HOLD, MONTHS, TOOLTIP_HEIGHT } from './constants';
import { useHeatmap, type HeatmapCell, type Slot } from './context';

export interface HeatmapTooltipProps {
  className?: string;
  /** The line shown for a cell. Defaults to the count and the date. */
  formatLabel?: (cell: HeatmapCell) => string;
  /**
   * How long a press has to be held before the readout takes over, in
   * milliseconds.
   *
   * It is not zero, and cannot be: a full year of columns lives inside a
   * horizontal scroller, and a readout that claims the touch on the first pixel
   * of movement means the chart can never be scrolled. Holding first is what
   * separates "I am moving the chart" from "I am reading it". Set `0` only for
   * a chart that is not inside a scroll view at all.
   */
  activateAfterLongPress?: number;
}

/**
 * A readout following the finger across the grid.
 *
 * It lives in the view layer, over the SVG: a gesture handler cannot be
 * attached to an SVG node, and SVG text ignores the platform's text scaling.
 * The cell under the finger is resolved on the UI thread and only crosses back
 * into JS when it changes, so a drag across a year costs a handful of
 * re-renders rather than one per frame.
 */
export function HeatmapTooltip({
  className,
  formatLabel,
  activateAfterLongPress = DEFAULT_HOLD,
}: HeatmapTooltipProps) {
  const { grid, activeCell, setActiveCell, cellAt } = useHeatmap(
    'HeatmapChart.Tooltip'
  );
  const step = grid.size + grid.gap;

  // Mirrored for the worklet, which cannot read the JS closure's latest value.
  const lastKey = useSharedValue(-1);

  const resolve = useMemo(
    () => (column: number, row: number) => setActiveCell(cellAt(column, row)),
    [cellAt, setActiveCell]
  );
  const clear = useMemo(() => () => setActiveCell(null), [setActiveCell]);

  /*
   * The cell is resolved here, on the UI thread, and only crosses into JS when
   * it *changes*. Sending every frame's coordinates over and picking the cell
   * in React would cost a re-render per frame for a value that changes maybe
   * fifty times across a whole drag.
   */
  const pick = (x: number, y: number) => {
    'worklet';
    const column = Math.floor(x / step);
    const row = Math.floor(y / step);
    if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) return;
    const key = column * grid.rows + row;
    if (key === lastKey.get()) return;
    lastKey.set(key);
    scheduleOnRN(resolve, column, row);
  };

  /*
   * The readout takes over only once the press has been held.
   *
   * `onStart` rather than `onBegin` is the other half of it: `onBegin` fires on
   * touch-down whatever happens next, so picking there would light a cell and
   * dim the rest of the grid for the first moment of every scroll swipe — the
   * gesture would yield correctly and still leave a flicker behind it.
   */
  const pan = Gesture.Pan()
    .minDistance(0)
    .activateAfterLongPress(activateAfterLongPress)
    .onStart((event) => {
      'worklet';
      pick(event.x, event.y);
    })
    .onUpdate((event) => {
      'worklet';
      pick(event.x, event.y);
    })
    .onFinalize(() => {
      'worklet';
      // Fires whether or not the gesture ever activated, so a swipe that only
      // scrolled must not report a cell change it never made.
      if (lastKey.get() === -1) return;
      lastKey.set(-1);
      scheduleOnRN(clear);
    });

  const label = activeCell
    ? formatLabel
      ? formatLabel(activeCell)
      : defaultTooltipLabel(activeCell)
    : null;

  // Flipped to the left of the finger past the halfway mark, so the readout
  // never runs off the edge it is closest to — and dropped below the cell in
  // the top two rows, where there is no room above it inside the chart.
  const anchorX = activeCell ? activeCell.column * step + grid.size / 2 : 0;
  const flipped = anchorX > grid.width / 2;
  const below = (activeCell?.row ?? 0) < 2;
  const anchorY = activeCell
    ? below
      ? activeCell.row * step + grid.size + 6
      : activeCell.row * step - TOOLTIP_HEIGHT - 6
    : 0;

  return (
    <>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>

      {activeCell && label ? (
        <View
          pointerEvents="none"
          className={cn(
            'absolute rounded-lg border border-border bg-popover px-2 py-1 shadow-md',
            className
          )}
          style={{
            top: anchorY,
            [flipped ? 'right' : 'left']: flipped ? grid.width - anchorX : anchorX,
          }}
        >
          <Text size="xs" className="text-popover-foreground">
            {label}
          </Text>
        </View>
      ) : null}
    </>
  );
}
HeatmapTooltip.slot = 'tooltip' as Slot;

/*
 * A cell with no date is not a cell with no data — it is a cell in a grid that
 * is not a calendar, and it has a count like any other. Saying "No data" over
 * it reports a hole in the data that is not there. Without a date there is
 * simply nothing to say after the number, so the number is the whole label,
 * and a grid that wants a noun for it passes `formatLabel`.
 */
function defaultTooltipLabel(cell: HeatmapCell) {
  if (!cell.date) return `${cell.count}`;
  const count = `${cell.count} ${cell.count === 1 ? 'contribution' : 'contributions'}`;
  const date = `${MONTHS[cell.date.getMonth()]} ${cell.date.getDate()}`;
  return `${count} on ${date}`;
}
