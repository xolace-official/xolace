/** Length of an audio file in whole seconds, read by the browser before any upload. */
export function readAudioDuration(file: File): Promise<number> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const audio = new Audio();
		audio.preload = "metadata";
		audio.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve(Math.round(audio.duration));
		};
		audio.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error(`Can't read ${file.name} as audio`));
		};
		audio.src = url;
	});
}

const SEPARATORS = /[_-]+/g;

/** `Too Many Small Doors.mp3` → `Too Many Small Doors` */
export function titleFromFileName(name: string) {
	const dot = name.lastIndexOf(".");
	return (dot > 0 ? name.slice(0, dot) : name)
		.replaceAll(SEPARATORS, " ")
		.trim();
}
