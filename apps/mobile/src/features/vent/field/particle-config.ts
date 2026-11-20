export const PARTICLE_COUNT = 100;
export const SPARSE_COUNT = 26;

export const BASE_RADIUS = 120;
export const MAX_RADIUS = 220;
export const PERSPECTIVE = 600;

export const ASSEMBLY_MS = 2000;
export const PULSE_MS = 1200;
export const COMPRESS_MS = 600;
export const FLASH_MS = 140;
export const SCATTER_MS = 2200;
export const SILENCE_MS = 1200;

export const FLAKE_EXTRA_MS = 900;
export const RING_MS = 900;
export const NEAR_MS = 15_000;
export const RM_FADE_MS = 900;
export const RM_ENTER_MS = 400;
export const AFTER_LEAD_MS = 400;
export const FROM_SPARSE = 0.62;

function mulberry32(seed: number) {
	"worklet";
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d_2b_79_f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

export { mulberry32 };

const rand = mulberry32(20_260_610);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const DIR_X: number[] = [];
export const DIR_Y: number[] = [];
export const DIR_Z: number[] = [];
export const SIZE: number[] = [];
export const SPEED: number[] = [];
export const PHASE0: number[] = [];
export const DELAY: number[] = [];
export const ENTRY_X: number[] = [];
export const ENTRY_Y: number[] = [];
export const SCAT_VX: number[] = [];
export const SCAT_VY: number[] = [];
export const SCAT_G: number[] = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
	const t = (i + 0.5) / PARTICLE_COUNT;
	const phi = Math.acos(1 - 2 * t);
	const theta = GOLDEN_ANGLE * i;
	DIR_X.push(Math.sin(phi) * Math.cos(theta));
	DIR_Y.push(Math.cos(phi));
	DIR_Z.push(Math.sin(phi) * Math.sin(theta));

	SIZE.push(2 + rand() * 2);
	SPEED.push((0.5 + rand()) * (rand() > 0.5 ? 1 : -1));
	PHASE0.push(rand() * Math.PI * 2);
	DELAY.push(rand() * 600);

	const entryAngle = rand() * Math.PI * 2;
	ENTRY_X.push(Math.cos(entryAngle));
	ENTRY_Y.push(Math.sin(entryAngle));

	const scatAngle = rand() * Math.PI * 2;
	const scatSpeed = 0.15 + rand() * 0.35;
	SCAT_VX.push(Math.cos(scatAngle) * scatSpeed);
	SCAT_VY.push(Math.sin(scatAngle) * scatSpeed - 0.06);
	SCAT_G.push(0.0001 + rand() * 0.0004);
}

export const FLAKE: boolean[] = DIR_X.map((_, i) => i % 3 === 0);

export const RAMP_STEPS = 32;
export const RAMP_R: number[] = [];
export const RAMP_G: number[] = [];
export const RAMP_B: number[] = [];

const STOPS = [
	[0x93, 0x99, 0xa8], // #9399A8 cool ash grey
	[0xc4, 0x88, 0x3f], // #C4883F warming ember
	[0xe8, 0xa8, 0x4c], // #E8A84C hot amber
];

for (let i = 0; i < RAMP_STEPS; i++) {
	const p = (i / (RAMP_STEPS - 1)) * (STOPS.length - 1);
	const lo = Math.min(Math.floor(p), STOPS.length - 2);
	const f = p - lo;
	RAMP_R.push((STOPS[lo][0] + (STOPS[lo + 1][0] - STOPS[lo][0]) * f) / 255);
	RAMP_G.push((STOPS[lo][1] + (STOPS[lo + 1][1] - STOPS[lo][1]) * f) / 255);
	RAMP_B.push((STOPS[lo][2] + (STOPS[lo + 1][2] - STOPS[lo][2]) * f) / 255);
}
