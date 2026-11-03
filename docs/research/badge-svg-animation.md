# Lightweight SVG badge animation in the Expo app

Researched 2026-11-03 for #679 (map #677). Versions below are what `apps/mobile` pins today.
Re-check them before relying on this.

## Recommendation

**Use Skia, which is already installed. Add no new dependency.**

- **Shelf (grid / carousels of 20+): static images, no animation.** Show each badge's
  resting frame as a bundled raster (`.webp`, exported from the SVG source at 3x) through
  `expo-image`. That is a native image view with caching and no per-frame work. Locked
  badges get their own grey silhouette raster. The streak mascot already uses this
  still + loop pattern (`apps/mobile/src/features/streak/campfire-mascot.tsx`).
- **Unlock sheet and detail page: one Skia `<Canvas>`.** The badge is split into a static
  **base** (drawn with `ImageSVG` from `useSVG(require(...))`) and one or two **fx layers**
  (the flame, a shimmer band, a sparkle). The fx layers are drawn as Skia primitives
  (`Path` from the SVG's `d` strings, gradients, `BlurMask`, blend modes) and driven by
  Reanimated shared values on the UI thread. That is the same pattern as
  `profile/components/ember-field.tsx` and `xolace-face/xolace-face.tsx`.
- **Reduced motion:** gate on the app's `useEffectiveReducedMotion()`
  (`src/lib/motion/use-effective-reduced-motion.ts`), not on Reanimated's
  `useReducedMotion()` alone. When motion is reduced, draw the fx layers at their resting
  values. The hero then matches the shelf still.

**Why not the alternatives**

| Option | Verdict |
|---|---|
| `react-native-svg` + Reanimated `useAnimatedProps` | Fine for one simple stroke or opacity tween (the app does this in `kindling/components/kindling-trail.tsx`). It is weaker for shimmer and glow: half the native filter set is missing, and per-frame SVG prop updates are not on Reanimated's fast path. Not needed when Skia is already here. |
| `expo-image` with an animated SVG (SMIL/CSS) | **Does not work.** iOS renders SVG through CoreSVG (via SDWebImageSVGCoder) and Android through AndroidSVG. AndroidSVG says SMIL and CSS animation are "not supported at all". expo-image is a good *static* SVG/raster renderer only. |
| Lottie / Rive | Not installed, not needed. If art direction ever wants After Effects-authored motion, Skia 2.14 already ships **Skottie** (`<Skottie animation frame>`, `Skia.Skottie.Make(json)`), a Lottie player with no new package. Keep it as an escape hatch only. |
| Pre-rendered loop (animated WebP / video), like the mascots | Works and is simple for one hero badge, but it costs about 40 files × MB, loses vector crispness at sheet size, and any art change means a re-render. Reasonable fallback for a few special badges. |

## What is installed (from this repo)

- `react-native-svg` 15.16.0, `react-native-reanimated` 4.7.1, `react-native-worklets`
  0.13.0, `@shopify/react-native-skia` 2.14.0, `expo-image` ~58.0.16, `expo-video` ~58.0.12
  (`apps/mobile/package.json`). No Lottie, no Rive, no `react-native-svg-transformer`.
- Skia is the app's main animation canvas: about 20 files use it (`xolace-face/*`,
  `profile/ember-field.tsx`, `vent/particles/*`, `talk/talk-aurora.tsx`,
  `components/shared/aurora-arc.tsx`, ...). Installed Skia exports `useSVG`, `ImageSVG`,
  `Skottie`, `Atlas` and offscreen `drawAsImage`
  (`node_modules/@shopify/react-native-skia/lib/typescript/src`).
- `react-native-svg` is used for icons and a few charts (`insights/glass.tsx`,
  `heatmap-chart/*`, `kindling-trail.tsx`).
- Most "mascots" are **animated WebP through expo-image**, with a still for reduced motion
  (`flux-campfire-loop.webp` / `flux-campfire-still.webp`, `jump-love.webp`). Only the
  onboarding hearth is a real video (`expo-video`, `hearth-test.mp4`).
- Reduced motion is a tri-state preference (system / reduced / full).
  `useEffectiveReducedMotion()` combines it with the live OS flag.
  `(protected)/_layout.tsx` sets `<ReducedMotionConfig>` so Reanimated's own
  `ReduceMotion.System` follows it.
- Metro's default `assetExts` includes `svg` (metro-config 0.87.1 defaults), so
  `require("./badge.svg")` resolves as an asset for `useSVG` / `expo-image` without a
  transformer.

## Findings by option

### react-native-svg + Reanimated

- Natively implemented filters: `FeBlend`, `FeColorMatrix`, `FeComposite`, `FeDropShadow`,
  `FeFlood`, `FeGaussianBlur`, `FeMerge`, `FeOffset`. `FeTurbulence`, `FeMorphology`,
  `FeDisplacementMap`, `FeComponentTransfer`, `FeConvolveMatrix` and the lighting filters
  only warn (`warnUnimplementedFilter`) [1][2]. Masks on native are experimental [1].
- `<style>` CSS needs `SvgCss` / `SvgCssUri`, not plain `SvgXml` [1]. SMIL (`<animate>`)
  is not part of the library (no such element in `src/elements`) [2].
- Gradients: exact numbers "has performance advantages over using percentages" [1].
- Reanimated's fast path for non-layout props
  (`IOS_/ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`) covers `opacity`, `transform`, colors,
  borders and shadows. SVG props are not on that list [4]. A separate
  `EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS` flag covers CSS animations for
  `Circle`, `Ellipse`, `Line`, `Path` and `Rect` [4].
- Reanimated guidance: animate "no more than 100 components for low-end Android devices"
  (~500 on iOS). For heavier scenes, "consider using Reanimated with react-native-skia
  instead of rendering individual React components" [3].

### Skia (Canvas / Path / shaders, ImageSVG)

- `ImageSVG` uses Skia's SVG module. "Text elements currently won't render and any
  external XML elements such as XLink or CSS won't render". Also unsupported: RGBA color
  syntax, `<animate>`, `<foreignObject>`, `<script>`. The parser is "much less forgiving"
  than browsers. Figma/Illustrator exports usually render [5].
- `ImageSVG` "doesn't follow the same painting rules as other components". Apply effects
  (opacity, blur) with a parent `Group` `layer` [5]. So animate the **fx layers as real
  Skia nodes**, not by tweaking the SVG document.
- Animating Skia props with shared values runs on the UI thread without React re-renders.
  The app relies on this already (`ember-field.tsx`: `withRepeat` breathing, gated on
  reduced motion).
- Skottie plays Lottie JSON with a Reanimated-driven `frame` prop [6].

### expo-image with SVG

- iOS: SDWebImageSVGCoder over Apple's private CoreSVG [7]. It notes crashes when CSS
  `opacity` is combined with `fill`, and compatibility issues with gradients and
  non-system fonts [7].
- Android: AndroidSVG 1.4 (`expo-image/android/build.gradle`). "SMIL and CSS animation is
  not supported", "Filter Effects via `<filter>` are not supported" [8].
- New in SDK 58: `svgVariables` substitutes CSS custom properties (`var(--x, fallback)`)
  before parsing. `tintColor` floods every pixel with one color, which gives a flat
  silhouette (and rasterizes on iOS) (`expo-image/src/Image.types.ts`).
- Verdict: static only. Three different SVG renderers (CoreSVG, AndroidSVG, Skia) would
  each read the same file a little differently. That is why the shelf uses rasters
  exported from one source rather than live SVG.

## Performance: shelf vs unlock

- **Shelf:** nothing should run per frame. 20+ `expo-image` rasters are the cheapest
  option, and they recycle cleanly in a FlatList/FlashList. 20+ live `<Canvas>` or `<Svg>`
  trees each cost a native view tree plus parse/draw. Avoid them in a scrolling list.
  Reanimated's documented FPS drop "when there are many animated components on the screen
  during scrolling" is the case to avoid [3].
- If the shelf must be vector (no raster export step): render `ImageSVG` with no animated
  values. Or draw each badge once to an `SkImage` (offscreen `drawAsImage`) and cache it.
  Never put `withRepeat` on a shelf item.
- **Unlock / detail:** one Canvas, 1-3 animated nodes. That is well inside the budget on
  both platforms. Stop loops when the sheet closes (unmount) and after the celebratory
  play, settle into a slow idle or stop.
- Several badges unlocked at once share one sheet (#677). Animate only the focused badge;
  show the others as stills.

## Reduced motion

- Reanimated `useReducedMotion()` returns the setting "when the app started", and
  "changing the reduced motion system setting doesn't cause your components to rerender"
  [9]. It also ignores the in-app tri-state. Use `useEffectiveReducedMotion()`.
- Reduced: render the resting frame (fx values set, no `withRepeat`). Optionally do a
  single opacity fade-in on unlock. `withTiming` under the app-wide `ReducedMotionConfig`
  already jumps to the end. Pass `reduceMotion: ReduceMotion.Never` only for a deliberate
  cross-fade (see `reflect/compose/use-morph.ts`).
- The resting frame must equal the shelf still, so nothing "pops" between screens.

## Authoring constraints for the art direction

Write for the strictest renderer (Skia's SVG module), so one file works everywhere.

1. **Square `viewBox`** (e.g. `0 0 256 256`), same medallion safe area on every badge. Absolute
   numbers, no `%`, no `em`.
2. **Presentation attributes only.** No `<style>`, no `class`, no CSS, no `var()`, no
   `rgba()`/`hsla()`. Use hex plus `fill-opacity` / `stroke-opacity`.
3. **No text.** Convert lettering to outlines.
4. **No `<filter>`.** No drop shadows, blurs or glows in the file. Glow and blur are added in
   code (Skia `BlurMask`) on the hero, and baked into the shelf raster.
5. **No SMIL / CSS animation, `<foreignObject>`, `<script>`, embedded rasters or external
   `xlink:href`.** Nothing we render plays them.
6. **Gradients:** linear and radial only, `gradientUnits="userSpaceOnUse"` with absolute
   coordinates, a few stops. No mesh gradients and no patterns. Avoid masks. Clip paths
   are fine but keep them simple.
7. **Layer separation:** top-level groups with stable ids, which the SVG optimizer must
   keep:
   - `<g id="base">`: everything static. It must look finished on its own.
   - `<g id="fx-<name>">` (e.g. `fx-flame`, `fx-shimmer`, `fx-sparkle`): each animated part,
     ideally one or a few `<path>`s, drawn **at its resting state**. Note the pivot point
     (e.g. flame base) in a `data-pivot="x,y"` attribute or a spec sheet.
   - At most two fx layers per badge, one motion idea each (flicker, sweep, twinkle).
8. **Resting frame = shelf still = reduced-motion frame.** Export the shelf `.webp` from
   the SVG as authored.
9. **Locked state:** a separate flat "embossed" silhouette asset per badge (or one shared
   medallion blank). A tint gives a flat silhouette for free, but not the embossed look.
10. **Fixed colors**, not theme tokens. Check both light and dark backgrounds.
11. **Small files:** few paths, no hidden layers, no editor metadata. Run SVGO with id
    cleanup **off** for `base` / `fx-*`.
12. Test every badge in Skia's `ImageSVG` once (the strictest parser) before handoff.

## Open questions for the build

- Raster export step: a small script (e.g. resvg or Skia offscreen) committed with the art,
  or have the artist export `.webp` by hand? Decide with #677's asset-production question.
- Do fx layers stay inside the SVG (parse `d` strings at runtime with `Skia.Path.MakeFromSVGString`)
  or get hand-coded per badge family? A shared fx kit (flame, shimmer, sparkle) applied to
  many badges is the lighter path.

## Sources

1. react-native-svg USAGE.md (filters, `SvgCss`, gradients, masks): https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md
2. Installed source: `node_modules/react-native-svg` 15.16.0 (`src/elements/filters/*`, `src/lib/util.ts`, `apple/Filters`, `android/.../horcrux/svg`).
3. Reanimated performance guide: https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
4. Reanimated feature flags: https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/
5. React Native Skia, SVG images doc: https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/image-svg.md
6. React Native Skia, Skottie doc: https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/skottie.md
7. SDWebImageSVGCoder README: https://github.com/SDWebImage/SDWebImageSVGCoder
8. AndroidSVG: https://bigbadaboom.github.io/androidsvg/
9. Reanimated `useReducedMotion`: https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/
10. Installed source: `expo-image` 58.0.16 (`src/Image.types.ts` `svgVariables`, `ios/ExpoImage.podspec`, `android/build.gradle`).
11. Repo: `apps/mobile/package.json`, `src/lib/motion/use-effective-reduced-motion.ts`, `src/app/(protected)/_layout.tsx`, `src/features/streak/campfire-mascot.tsx`, `src/features/profile/components/ember-field.tsx`, `src/features/xolace-face/xolace-face.tsx`, `src/features/kindling/components/kindling-trail.tsx`.
