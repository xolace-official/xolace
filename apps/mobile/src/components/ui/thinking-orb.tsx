/**
 * ThinkingOrb — a dotted orb that says what an agent is doing.
 *
 * A spinner says "busy". These say *which kind of busy*: particles running
 * tilted orbits for work in flight, a scan meridian sweeping a globe for a
 * search, bands that scramble and click back for a solve. Six states, each a
 * distinct silhouette in motion, so a glance at the orb is enough — which is
 * the whole point of putting one next to a streaming reply.
 *
 * ```tsx
 * <ThinkingOrb state="searching" />
 * <ThinkingOrb state="working" size={20} />
 * ```
 *
 * ## How it is drawn
 *
 * The geometry is honestly three-dimensional — points on a sphere, rotated and
 * tilted, projected orthographically, with depth carried by dot size and ink
 * weight. React Native has no 2D canvas to paint that into, and one animated
 * SVG node per dot would be two hundred native prop writes a frame, which no
 * amount of tuning survives.
 *
 * So the dots are quantised into eight ink buckets and each bucket is emitted
 * as a *single* path of circle arcs. Eight animated props a frame, whatever the
 * dot count, and depth ordering falls out of bucket order for free — depth is
 * what drives the ink in the first place, so painting faint to strong paints
 * far to near. Everything from the trigonometry to the path strings runs in one
 * worklet on the UI thread; React renders once and then never again.
 *
 * The maths lives in `thinking-orb-geometry.ts` and the six per-state drawing
 * routines in `thinking-orb-states.ts`; this file is the profiles and the view.
 *
 * Strictly monochrome, from `--color-foreground`, so the orb inverts with the
 * theme and needs no palette of its own.
 */
import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnUI } from 'react-native-worklets';
import { useCSSVariable } from 'uniwind';
import { cn } from '@/src/lib/utils';
import { BUCKETS, type Profile } from './thinking-orb-geometry';
import { renderFrame, type ThinkingOrbState } from './thinking-orb-states';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The frame a still orb shows. Far enough in that no state is at its start. */
const STILL_FRAME = 2.4;

export type { ThinkingOrbState };

/** What each state is doing, for anyone who cannot see it. */
const STATE_LABEL: Record<ThinkingOrbState, string> = {
  working: 'Working',
  searching: 'Searching',
  solving: 'Solving',
  listening: 'Listening',
  composing: 'Composing',
  shaping: 'Shaping',
};

const PROFILES: Record<ThinkingOrbState, { md: Profile; sm: Profile }> = {
  working: {
    md: { speed: 1.9, rows: 9, density: 26, radius: 1 },
    sm: { speed: 3.9, rows: 4, density: 12, radius: 2.4 },
  },
  searching: {
    md: { speed: 2.0, rows: 11, density: 28, radius: 1.15 },
    sm: { speed: 2.7, rows: 5, density: 12, radius: 1.75 },
  },
  solving: {
    md: { speed: 1.8, rows: 10, density: 24, radius: 1.05 },
    sm: { speed: 2.0, rows: 5, density: 11, radius: 1.9 },
  },
  listening: {
    md: { speed: 4.4, rows: 10, density: 24, radius: 1 },
    sm: { speed: 4.0, rows: 5, density: 11, radius: 1.6 },
  },
  composing: {
    md: { speed: 2.3, rows: 5, density: 44, radius: 0.85 },
    sm: { speed: 3.1, rows: 3, density: 20, radius: 1.1 },
  },
  shaping: {
    md: { speed: 2.4, rows: 1, density: 26, radius: 1 },
    sm: { speed: 2.1, rows: 1, density: 14, radius: 1.05 },
  },
};

const BUCKET_INDICES = Array.from({ length: BUCKETS }, (_unused, index) => index);

/**
 * One ink level's worth of dots, as a single path.
 *
 * It is a component rather than a loop of `useAnimatedProps` in the parent so
 * that each bucket owns exactly one hook — the count is a module constant, but
 * hooks in a loop is still a rule waiting to be broken by the next person who
 * makes it configurable.
 */
function Bucket({
  index,
  paths,
  ink,
}: {
  index: number;
  paths: SharedValue<string[]>;
  ink: string;
}) {
  const animatedProps = useAnimatedProps(() => ({ d: paths.value[index] ?? '' }));

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill={ink}
      fillOpacity={(index + 0.5) / BUCKETS}
    />
  );
}

export interface ThinkingOrbProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Which of the six animations to show. */
  state?: ThinkingOrbState;
  /**
   * Side of the orb in pixels.
   *
   * Two tunings ship, and they are separate designs rather than one scaled:
   * at or below 32 the orb switches to far fewer, proportionally much larger
   * dots moving faster, because a faithful lattice at that size is grey mush.
   */
  size?: number;
  /** Multiplier on the state's own speed. */
  speed?: number;
  /** Freeze on the current frame. */
  paused?: boolean;
  /** Ink colour. Defaults to the theme's foreground, so the orb inverts with it. */
  color?: string;
  /** Overrides the per-state default announced to screen readers. */
  accessibilityLabel?: string;
}

export function ThinkingOrb({
  className,
  state = 'working',
  size = 64,
  speed = 1,
  paused = false,
  color,
  accessibilityLabel,
  style,
  ...props
}: ThinkingOrbProps) {
  const reducedMotion = useReducedMotion();
  const foreground = useCSSVariable('--color-foreground');
  const ink = color ?? (typeof foreground === 'string' ? foreground : '#0a0a0a');

  const profile = PROFILES[state][size <= 32 ? 'sm' : 'md'];
  const clock = useSharedValue(0);
  const paths = useSharedValue<string[]>([]);

  const still = !paused && !reducedMotion;

  const frame = useFrameCallback((info) => {
    'worklet';
    // Elapsed time is accumulated rather than derived from the total, so
    // `speed` can change mid-animation without the orb jumping to wherever the
    // new rate would have put it by now. A dropped frame is clamped rather than
    // honoured — a 300ms hitch played back at full rate is a lurch.
    const delta = Math.min(info.timeSincePreviousFrame ?? 16, 48) / 1000;
    clock.value += delta * profile.speed * speed;
    paths.value = renderFrame(state, size, clock.value, profile);
  }, false);

  const { setActive } = frame;
  useEffect(() => {
    setActive(still);
    return () => setActive(false);
  }, [still, setActive]);

  // A still orb is not an empty one: reduced motion and `paused` both get a
  // representative frame rather than nothing, which is the difference between
  // "not animating" and "broken".
  useEffect(() => {
    if (still) return;
    scheduleOnUI(() => {
      'worklet';
      paths.value = renderFrame(
        state,
        size,
        clock.value > 0 ? clock.value : STILL_FRAME,
        profile
      );
    });
  }, [still, state, size, profile, clock, paths]);

  return (
    <View
      {...props}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? STATE_LABEL[state]}
      className={cn('items-center justify-center', className)}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Faint to strong, which is also far to near — depth is what drives
            the ink, so bucket order is depth order and no sort is needed. */}
        {BUCKET_INDICES.map((index) => (
          <Bucket key={index} index={index} paths={paths} ink={ink} />
        ))}
      </Svg>
    </View>
  );
}

ThinkingOrb.displayName = 'ThinkingOrb';
