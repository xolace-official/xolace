# Loader

Compound component for repeating keyframe-driven animations — bouncing dots, spinners, progress indicators, and any looping motion.

## Anatomy

```tsx
<Loader>
  <Loader.KeyframeView keyframes={...} />
  <Loader.KeyframeView keyframes={...} />
</Loader>
```

| Part                  | Description                                                                    |
| --------------------- | ------------------------------------------------------------------------------ |
| `Loader`              | Root container. Drives a repeating progress (0–1) and provides it to children. |
| `Loader.KeyframeView` | Animated View whose styles are interpolated from keyframes along the progress. |

## Core Concept

`Loader` is a repeating animation timeline. The root component ticks a shared progress value from 0 to 1 over the given `duration`, then restarts. Every `Loader.KeyframeView` inside reads that same progress and interpolates its own styles from keyframes you define.

Think of it as a single timeline — each `KeyframeView` describes what should happen to **its view** at specific points along that timeline.

### Keyframes

Keyframes map progress positions to style snapshots. Keys can be **0–1** or **0–100** (auto-normalized to 0–1).

```tsx
const KEYFRAMES: LoaderKeyframes = {
  0: { transform: [{ translateY: 0 }] },
  50: { transform: [{ translateY: -12 }] },
  100: { transform: [{ translateY: 0 }] },
};
```

The view starts at `translateY: 0`, peaks at `-12` halfway through, and returns by the end.

You can animate any combination of numeric properties (`opacity`, `width`, `height`, `borderRadius`, …), color properties (`backgroundColor`, `borderColor`, …), and transforms (`translateX`, `scale`, `rotate`, …) in a single keyframe set.

### Multiple Views on One Timeline

Since every `KeyframeView` shares the same progress, you control **when** each view moves by placing its keyframes at different positions. For example, to stagger three dots:

```tsx
<Loader duration={1200}>
  {/* Dot 1 bounces early */}
  <Loader.KeyframeView
    keyframes={{
      0: { transform: [{ translateY: 0 }] },
      30: { transform: [{ translateY: -12 }] },
      60: { transform: [{ translateY: 0 }] },
    }}
  />

  {/* Dot 2 bounces in the middle */}
  <Loader.KeyframeView
    keyframes={{
      20: { transform: [{ translateY: 0 }] },
      50: { transform: [{ translateY: -12 }] },
      80: { transform: [{ translateY: 0 }] },
    }}
  />

  {/* Dot 3 bounces late */}
  <Loader.KeyframeView
    keyframes={{
      40: { transform: [{ translateY: 0 }] },
      70: { transform: [{ translateY: -12 }] },
      100: { transform: [{ translateY: 0 }] },
    }}
  />
</Loader>
```

Each dot uses the same timeline but peaks at a different moment, creating a staggered wave.

## Usage

### Basic bounce

```tsx
import Loader from "@/src/shared/components/loader";

<Loader duration={1000}>
  <Loader.KeyframeView
    keyframes={{
      0: { transform: [{ translateY: 0 }] },
      50: { transform: [{ translateY: -12 }] },
      100: { transform: [{ translateY: 0 }] },
    }}
    className="size-4 rounded-full bg-blue-500"
  />
</Loader>;
```

### Ping-pong with reverse

Define only the one-way trip — `reverse` plays it back automatically.

```tsx
<Loader duration={500} reverse easing={Easing.out(Easing.cubic)}>
  <Loader.KeyframeView
    keyframes={{
      0: { opacity: 1, transform: [{ translateX: -14 }] },
      100: { opacity: 0.25, transform: [{ translateX: 14 }] },
    }}
    className="size-3 rounded-full bg-white"
  />
</Loader>
```

### Mixed property types

Combine numeric, color, and transform properties freely.

```tsx
<Loader duration={2000}>
  <Loader.KeyframeView
    keyframes={{
      0: { borderRadius: 4, backgroundColor: "#6366f1", transform: [{ rotate: "0deg" }] },
      50: { borderRadius: 20, backgroundColor: "#ec4899", transform: [{ rotate: "180deg" }] },
      100: { borderRadius: 4, backgroundColor: "#6366f1", transform: [{ rotate: "360deg" }] },
    }}
    className="size-10"
  />
</Loader>
```

### Controlled progress

Drive the animation externally with a SharedValue. Auto-play is disabled.

```tsx
const progress = useSharedValue(0);

progress.set(withTiming(1, { duration: 2000 }));

<Loader progress={progress}>
  <Loader.KeyframeView keyframes={...} />
</Loader>
```

### Synced animations via onProgress

Mirror the internal progress to derive related animations on the UI thread.

```tsx
const loaderProgress = useSharedValue(0);

const opacityStyle = useAnimatedStyle(() => ({
  opacity: interpolate(loaderProgress.get(), [0, 1], [0.5, 1]),
}));

<Loader duration={1000} onProgress={loaderProgress}>
  <Loader.KeyframeView keyframes={...} />
</Loader>
```

## API Reference

### Loader

Root container. Accepts all `ViewProps`.

| Prop           | Type                                      | Default         | Description                                          |
| -------------- | ----------------------------------------- | --------------- | ---------------------------------------------------- |
| `children`     | `ReactNode`                               | —               | Content including `KeyframeView` children.           |
| `duration`     | `number`                                  | `1000`          | Duration of one cycle in ms.                         |
| `initialDelay` | `number`                                  | `0`             | Delay before the first cycle in ms.                  |
| `repeatDelay`  | `number`                                  | `0`             | Delay between repeat cycles in ms.                   |
| `numberOfReps` | `number`                                  | `-1`            | Repeat count. `-1` for infinite.                     |
| `reverse`      | `boolean`                                 | `false`         | Ping-pong mode: plays forward then backward (0→1→0). |
| `easing`       | `EasingFunction \| EasingFunctionFactory` | `Easing.linear` | Easing function applied to the progress curve.       |
| `progress`     | `SharedValue<number>`                     | —               | External progress (0–1). Disables auto-play.         |
| `onProgress`   | `SharedValue<number>`                     | —               | Mirrors internal progress on the UI thread.          |
| `...rest`      | `ViewProps`                               | —               | All standard View props.                             |

### Loader.KeyframeView

Animated View whose styles are interpolated from keyframes. Accepts all `ViewProps`.

| Prop        | Type              | Default | Description                                                                            |
| ----------- | ----------------- | ------- | -------------------------------------------------------------------------------------- |
| `keyframes` | `LoaderKeyframes` | —       | Keyframe definitions. Keys 0–1 or 0–100 (auto-normalized). Values are style snapshots. |
| `...rest`   | `ViewProps`       | —       | All standard View props including `style` and `className`.                             |

### LoaderKeyframes

```ts
type LoaderKeyframes = Record<number, LoaderKeyframeStyle>;
```

Keys represent positions on the animation timeline (0–1 or 0–100). Values are style objects that can include:

- **Numeric properties** — `opacity`, `width`, `height`, `borderRadius`, `borderWidth`, `margin*`, `padding*`, etc.
- **Color properties** — `backgroundColor`, `borderColor`, `shadowColor`, etc.
- **Transforms** — `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `rotateZ`, `skewX`, `skewY`, `perspective`.

All properties are interpolated linearly between keyframe positions. Colors use Reanimated's `interpolateColor`. Angle transforms accept strings (`"180deg"`) or numbers (converted to degrees at render).
