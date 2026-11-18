/**
 * v2: the words burn like paper (handoff §10), native-cook smoke-butterfly-splash's
 * noise-threshold dissolve. One shader samples the reply drawn into an image; a front crosses it
 * in reading order, roughened by value noise, with an amber edge and a charred band behind it.
 * Everything is in points. `thr` is the only uniform that moves: −0.08 + 1.18 × ms / 1300.
 */
export const WORD_BURN_MS = 1300;

export const thresholdAt = (ms: number) => {
	"worklet";
	return -0.08 + (ms / WORD_BURN_MS) * 1.18;
};

/** When the front reaches a point of value v (inverse of `thresholdAt`). */
export const reachedAt = (v: number) => {
	"worklet";
	return ((v + 0.08) / 1.18) * WORD_BURN_MS;
};

export const BURN_SKSL = `
uniform shader text;
uniform float2 org;
uniform float2 size;
uniform float top;
uniform float lineH;
uniform float lines;
uniform float thr;

float hash(float2 q) { return fract(sin(q.x * 127.1 + q.y * 311.7) * 43758.5453); }
float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = p - i;
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}

half4 main(float2 p) {
  float a = text.eval(p).a;
  if (a < 0.002) { return half4(0.0); }
  float li = clamp(floor((p.y - top) / lineH), 0.0, lines - 1.0);
  float o = (li + (p.x - org.x) / size.x) / lines;
  float n = 0.65 * vnoise(p / 7.0) + 0.35 * vnoise(p / 2.6);
  float d = 0.66 * o + 0.34 * n - thr;
  if (d >= 0.0) {
    float e = exp(-(d / 0.03) * (d / 0.03));
    float3 col = mix(float3(245.0, 240.0, 232.0), float3(255.0, 196.0, 110.0), e) / 255.0;
    return half4(half3(col * a), half(a));
  }
  if (d > -0.05) {
    float k = -d / 0.05;
    float3 col = mix(float3(232.0, 168.0, 76.0), float3(58.0, 51.0, 44.0), k) / 255.0;
    float aa = a * (1.0 - k);
    return half4(half3(col * aa), half(aa));
  }
  return half4(0.0);
}
`;

/** The same value noise on the CPU, for when each ash point is born. */
function hash(x: number, y: number) {
	"worklet";
	const v = Math.sin(x * 127.1 + y * 311.7) * 43_758.5453;
	return v - Math.floor(v);
}

export function vnoise(x: number, y: number) {
	"worklet";
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const xf = x - xi;
	const yf = y - yi;
	const u = xf * xf * (3 - 2 * xf);
	const w = yf * yf * (3 - 2 * yf);
	const a = hash(xi, yi);
	const b = hash(xi + 1, yi);
	const c = hash(xi, yi + 1);
	const d = hash(xi + 1, yi + 1);
	return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
}
