/**
 * ThinkingOrb — the six states.
 *
 * Each `draw*` writes one frame's dots into the bucket array it is handed; none
 * of them own any state, so a frame is a pure function of `(state, size, t)`.
 * The maths they lean on lives in `thinking-orb-geometry.ts`.
 */
import {
  BUCKETS,
  angleDelta,
  dot,
  hashD,
  project,
  radiusScale,
  type Profile,
} from './thinking-orb-geometry';

export type ThinkingOrbState =
  | 'working'
  | 'searching'
  | 'solving'
  | 'listening'
  | 'composing'
  | 'shaping';

/**
 * `working` — particles running tilted orbits, each on a faint ghost path.
 *
 * The ghosts are what make it read as orbits rather than as loose specks: three
 * bright particles alone look random, and the same three on a visible track
 * look like work being done.
 */
function drawWorking(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.82;
  const rs = radiusScale(size) * p.radius;
  const sy = Math.sin(t * 0.12);
  const cy = Math.cos(t * 0.12);
  const st = Math.sin(0.3);
  const ct = Math.cos(0.3);
  const v = [0, 0, 0];

  for (let orbit = 0; orbit < p.rows; orbit++) {
    const h1 = hashD(orbit, 1.7);
    const h2 = hashD(orbit, 5.2);
    const h3 = hashD(orbit, 8.9);
    const ro = R * (0.45 + 0.52 * h1);
    const theta = h1 * 2 * Math.PI;
    const phi = Math.acos(2 * h2 - 1);

    // An orthonormal basis for the orbit's plane, from its normal.
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(theta);
    const ul = Math.max(1e-6, Math.hypot(ny, nx));
    const ux = -ny / ul;
    const uy = nx / ul;
    const vx = ny * 0 - nz * uy;
    const vy = nz * ux - nx * 0;
    const vz = nx * uy - ny * ux;

    const speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1);

    for (let k = 0; k < p.density; k++) {
      const a = (k / p.density) * 2 * Math.PI;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      project(v, (ux * ca + vx * sa) * ro, (uy * ca + vy * sa) * ro, (vz * sa) * ro, sy, cy, st, ct, c, c, 1);
      const depth = (v[2]! / ro + 1) / 2;
      dot(out, v[0]!, v[1]!, 0.9 * rs, 0.28 * (0.4 + 0.6 * depth));
    }

    for (let m = 0; m < 3; m++) {
      const a = t * speed + (m / 3) * 2 * Math.PI + h2 * 6;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      project(v, (ux * ca + vx * sa) * ro, (uy * ca + vy * sa) * ro, (vz * sa) * ro, sy, cy, st, ct, c, c, 1);
      const depth = (v[2]! / ro + 1) / 2;
      dot(out, v[0]!, v[1]!, (1.2 + 1.6 * depth) * rs, 0.7 + 0.22 * depth);
    }
  }
}

/**
 * `searching` — a scan meridian sweeping a dotted globe.
 *
 * The scan is a ripple in dot *size*, not a highlight. A brightness sweep on a
 * monochrome orb reads as a lighting effect; a size ripple reads as something
 * passing over the surface, which is what a search is.
 */
function drawSearching(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.82;
  const rs = radiusScale(size) * p.radius;
  const spin = 0.5;
  const tilt = 0.4 + 0.06 * Math.sin(t * 0.35);
  const sy = Math.sin(t * spin);
  const cySpin = Math.cos(t * spin);
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const scan = t * (spin + (1.7 - spin) * 4.1);
  const v = [0, 0, 0];

  for (let li = 0; li <= p.rows; li++) {
    const lat = -Math.PI / 2 + (li / p.rows) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const count = Math.max(1, Math.round(Math.abs(cosLat) * p.density));

    for (let lj = 0; lj < count; lj++) {
      const lon = (lj / count) * 2 * Math.PI;
      project(v, cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon), sy, cySpin, st, ct, c, c, R);
      const depth = (v[2]! + 1) / 2;
      const delta = angleDelta(lon + t * spin, scan);
      const boost = Math.exp(-(delta * delta) / 0.18) * Math.max(0, v[2]!);
      const ink = 0.38 + 0.54 * depth;
      dot(
        out,
        v[0]!,
        v[1]!,
        (0.6 + 1.7 * depth + boost) * rs,
        ink * (0.45 + 0.55 * Math.min(1, boost))
      );
    }
  }
}

/**
 * `solving` — bands twist in quarter turns, then replay in reverse and click
 * back to solved.
 *
 * The palindrome is the whole trick. A scramble that never resolves reads as
 * confusion; one that comes apart and goes back together reads as an answer
 * being found, and it loops seamlessly because it ends where it began.
 */
function drawSolving(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.82;
  const rs = radiusScale(size) * p.radius;
  const yaw = t * 0.55;
  const tilt = 0.35 + 0.1 * Math.sin(t * 0.9);
  const sy = Math.sin(yaw);
  const cySpin = Math.cos(yaw);
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const v = [0, 0, 0];

  const moves = 10;
  const slot = 0.42;
  const rest = 1.2;
  const cycle = 2 * moves * slot + rest;
  const tc = t % cycle;

  // How far through each move we are: all the way for the ones already made,
  // eased for the one under way, nothing for the ones still to come.
  const amount: number[] = [];
  let active = -1;
  for (let i = 0; i < moves; i++) amount.push(0);

  if (tc < 2 * moves * slot) {
    const index = Math.floor(tc / slot);
    const local = Math.min(1, (tc - index * slot) / slot / 0.7);
    const eased = 1 - (1 - local) ** 3;
    if (index < moves) {
      for (let i = 0; i < index; i++) amount[i] = 1;
      amount[index] = eased;
      active = index;
    } else {
      const undo = 2 * moves - 1 - index;
      for (let i = 0; i < undo; i++) amount[i] = 1;
      amount[undo] = 1 - eased;
      active = undo;
    }
  }

  for (let li = 0; li <= p.rows; li++) {
    const lat = -Math.PI / 2 + (li / p.rows) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const count = Math.max(1, Math.round(Math.abs(cosLat) * p.density));

    for (let lj = 0; lj < count; lj++) {
      const lon = (lj / count) * 2 * Math.PI;
      let x = cosLat * Math.cos(lon);
      let y = sinLat;
      let z = cosLat * Math.sin(lon);
      let inActive = false;

      for (let i = 0; i < moves; i++) {
        if (amount[i]! <= 0) continue;
        const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3));
        const lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
        const coord = axis === 0 ? x : axis === 1 ? y : z;
        if (coord < lo || coord >= lo + 0.5) continue;
        if (i === active) inActive = true;

        const dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
        const a = ((dir * Math.PI) / 2) * amount[i]!;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        if (axis === 0) {
          const y2 = y * ca - z * sa;
          z = y * sa + z * ca;
          y = y2;
        } else if (axis === 1) {
          const x2 = x * ca + z * sa;
          z = -x * sa + z * ca;
          x = x2;
        } else {
          const x2 = x * ca - y * sa;
          y = x * sa + y * ca;
          x = x2;
        }
      }

      project(v, x, y, z, sy, cySpin, st, ct, c, c, R);
      const depth = (v[2]! + 1) / 2;
      // The band under the hand inks a touch stronger, so the turn is legible.
      dot(
        out,
        v[0]!,
        v[1]!,
        (0.6 + 1.7 * depth + (inActive ? 0.3 : 0)) * rs,
        0.38 + 0.54 * depth + (inActive ? 0.14 : 0)
      );
    }
  }
}

/**
 * `listening` — a waveform rolling through the latitude rings.
 *
 * Two waves at unrelated tempi, so the surface never quite repeats. One wave
 * gives a pulse, which reads as a heartbeat rather than as listening.
 */
function drawListening(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.874;
  const rs = radiusScale(size) * p.radius;
  const sy = Math.sin(t * 0.18);
  const cySpin = Math.cos(t * 0.18);
  const st = Math.sin(0.38);
  const ct = Math.cos(0.38);
  const v = [0, 0, 0];

  for (let ri = 0; ri <= p.rows; ri++) {
    const lat = -Math.PI / 2 + (ri / p.rows) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const w = 0.62 * Math.sin(t * 2.1 - ri * 0.52) + 0.38 * Math.sin(t * 1.27 + ri * 0.83);
    const rr = R * (0.88 + 0.105 * w);
    const crest = Math.max(0, w);
    const count = Math.max(1, Math.round(Math.abs(cosLat) * p.density));

    for (let lj = 0; lj < count; lj++) {
      const lon = (lj / count) * 2 * Math.PI;
      project(v, cosLat * Math.cos(lon) * rr, sinLat * rr, cosLat * Math.sin(lon) * rr, sy, cySpin, st, ct, c, c, 1);
      const depth = (v[2]! / R + 1) / 2;
      dot(
        out,
        v[0]!,
        v[1]!,
        (0.6 + 1.7 * depth) * (1 + 0.4 * crest) * rs,
        0.34 + 0.56 * depth + 0.1 * crest
      );
    }
  }
}

/**
 * `composing` — an undulating sash of parallel strands on a great circle,
 * inside a faint dotted shell.
 *
 * The band's own tumble is frozen. Left spinning it competes with the
 * undulation and the two motions cancel into noise; held still, the wave
 * travelling along it is the only thing moving, and it reads as a line of
 * something being written.
 */
function drawComposing(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.78;
  const rs = radiusScale(size) * p.radius;
  const st = Math.sin(0.3);
  const ct = Math.cos(0.3);
  const v = [0, 0, 0];

  // The shell: a Fibonacci lattice, which is the only way to scatter points on
  // a sphere evenly without them lining up into visible seams.
  const shell = 70;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < shell; i++) {
    const y = 1 - (2 * (i + 0.5)) / shell;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * golden;
    project(v, rad * Math.cos(a) * R, y * R, rad * Math.sin(a) * R, 0, 1, st, ct, c, c, 1);
    const depth = (v[2]! / R + 1) / 2;
    dot(out, v[0]!, v[1]!, 0.8 * rs, 0.22 * (0.3 + 0.7 * depth));
  }

  const ta = 0.55;
  const ux = 1;
  const uz = 0;
  const vx = -uz * Math.sin(ta);
  const vy = Math.cos(ta);
  const vz = ux * Math.sin(ta);
  const nx = -uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy;

  const lanes = p.rows;
  const half = Math.max(1, (lanes - 1) / 2);

  for (let w = 0; w < lanes; w++) {
    const laneOffset = (w - (lanes - 1) / 2) * 0.075;
    const edge = Math.abs(w - (lanes - 1) / 2) / half;

    for (let k = 0; k < p.density; k++) {
      const a = (k / p.density) * 2 * Math.PI;
      const wobble =
        0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1);
      const off = laneOffset + wobble;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const x = ux * ca + vx * sa + nx * off;
      const y = vy * sa + ny * off;
      const z = uz * ca + vz * sa + nz * off;
      const l = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
      project(v, (x / l) * R, (y / l) * R, (z / l) * R, 0, 1, st, ct, c, c, 1);
      const depth = (v[2]! / R + 1) / 2;
      dot(
        out,
        v[0]!,
        v[1]!,
        (1.1 + 1.7 * depth) * (1 - 0.25 * edge) * rs,
        (0.48 + 0.44 * depth - 0.18 * edge) * (0.4 + 0.6 * depth)
      );
    }
  }
}

/** The three outlines `shaping` cycles through, as closed paths. */
const SHAPES: number[][] = [
  // A circle is sampled, not listed — the marker below says so.
  [],
  [0, -0.26, 0.24, 0.16, -0.24, 0.16],
  [0, -0.2, 0.2, -0.2, 0.2, 0.2, -0.2, 0.2, -0.2, -0.2],
];

/** Point at arc-length fraction `f` around shape `index`. */
function shapePoint(out: number[], index: number, f: number): void {
  'worklet';
  const verts = SHAPES[index]!;
  if (!verts.length) {
    // Started at top-centre and walked clockwise, so every shape's dot zero is
    // in the same place and the morph has nothing to unwind.
    const a = -Math.PI / 2 + f * 2 * Math.PI;
    out[0] = Math.cos(a) * 0.24;
    out[1] = Math.sin(a) * 0.24;
    return;
  }

  const n = verts.length / 2;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    total += Math.hypot(verts[j * 2]! - verts[i * 2]!, verts[j * 2 + 1]! - verts[i * 2 + 1]!);
  }

  let target = f * total;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = verts[i * 2]!;
    const ay = verts[i * 2 + 1]!;
    const bx = verts[j * 2]!;
    const by = verts[j * 2 + 1]!;
    const len = Math.hypot(bx - ax, by - ay);
    if (target <= len || i === n - 1) {
      const ff = len ? Math.min(1, target / len) : 0;
      out[0] = ax + (bx - ax) * ff;
      out[1] = ay + (by - ay) * ff;
      return;
    }
    target -= len;
  }
}

/**
 * `shaping` — a dotted outline morphing circle → triangle → square.
 *
 * The two outlines are blended first and the dots laid evenly along the
 * *result*, rather than each dot being tweened from its old place to its new
 * one. Tweening per dot bunches them at the corners halfway through the morph;
 * re-spacing every frame keeps the outline uniform at every instant, which is
 * what makes the shape read as a shape while it is changing.
 */
function drawShaping(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const hold = 1.4;
  const morph = 0.9;
  const seg = hold + morph;
  const shapes = 3;
  const tc = t % (seg * shapes);
  const k = Math.floor(tc / seg);
  const local = tc - k * seg;
  const raw = local > hold ? (local - hold) / morph : 0;
  const m = raw * raw * (3 - 2 * raw);
  const spread = 1.45;

  const samples = 96;
  const px: number[] = [];
  const py: number[] = [];
  const a = [0, 0];
  const b = [0, 0];

  for (let i = 0; i < samples; i++) {
    const f = i / samples;
    shapePoint(a, k, f);
    shapePoint(b, (k + 1) % shapes, f);
    px.push((a[0]! + (b[0]! - a[0]!) * m) * spread);
    py.push((a[1]! + (b[1]! - a[1]!) * m) * spread);
  }

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const j = (i + 1) % samples;
    const l = Math.hypot(px[j]! - px[i]!, py[j]! - py[i]!);
    lengths.push(l);
    total += l;
  }

  const n = p.density;
  const rs = radiusScale(size) * p.radius;
  const r = Math.max(0.35, 2.95 * spread * rs);
  const pulse = 1 + 0.02 * Math.sin(local * 3.1);
  let index = 0;
  let walked = 0;

  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (walked + lengths[index]! < target && index < samples - 1) {
      walked += lengths[index]!;
      index++;
    }
    const j = (index + 1) % samples;
    const f = lengths[index]! ? Math.min(1, (target - walked) / lengths[index]!) : 0;
    const x = (px[index]! + (px[j]! - px[index]!) * f) * pulse;
    const y = (py[index]! + (py[j]! - py[index]!) * f) * pulse;
    dot(out, c + x * size, c + y * size, r, 0.92);
  }
}

/** Builds one frame's worth of bucket paths. */
export function renderFrame(
  state: ThinkingOrbState,
  size: number,
  t: number,
  p: Profile
): string[] {
  'worklet';
  const out: string[] = [];
  for (let i = 0; i < BUCKETS; i++) out.push('');

  if (state === 'working') drawWorking(out, size, t, p);
  else if (state === 'searching') drawSearching(out, size, t, p);
  else if (state === 'solving') drawSolving(out, size, t, p);
  else if (state === 'listening') drawListening(out, size, t, p);
  else if (state === 'composing') drawComposing(out, size, t, p);
  else drawShaping(out, size, t, p);

  return out;
}
