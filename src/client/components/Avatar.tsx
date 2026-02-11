import "./Avatar.css";

interface AvatarProps {
	seed: number;
	size?: "default" | "sm";
}

function seededRand(seed: number, idx: number): number {
	const x = Math.sin(seed * 9301 + idx * 4973) * 49297;
	return x - Math.floor(x);
}

export function Avatar({ seed, size = "default" }: AvatarProps) {
	const hue1 = seed % 360;
	const hue2 = (seed + 120) % 360;
	const hue3 = (seed + 240) % 360;

	const r1 = seededRand(seed, 1);
	const r2 = seededRand(seed, 2);
	const r3 = seededRand(seed, 3);
	const r4 = seededRand(seed, 4);

	// Pick pattern variant based on seed
	const variant = seed % 4;

	let background: string;

	if (variant === 0) {
		// Radial blobs
		background = [
			`radial-gradient(circle at ${25 + r1 * 50}% ${20 + r2 * 60}%, hsl(${hue1}, 75%, 55%) 0%, transparent 50%)`,
			`radial-gradient(circle at ${50 + r3 * 30}% ${60 + r4 * 30}%, hsl(${hue2}, 65%, 50%) 0%, transparent 45%)`,
			`radial-gradient(circle at ${10 + r2 * 40}% ${70 + r1 * 20}%, hsl(${hue3}, 60%, 45%) 0%, transparent 55%)`,
			`linear-gradient(${r1 * 360}deg, hsl(${hue1}, 40%, 25%), hsl(${hue2}, 35%, 20%))`,
		].join(", ");
	} else if (variant === 1) {
		// Conic sweep
		const from = Math.round(r1 * 360);
		background = [
			`conic-gradient(from ${from}deg at ${40 + r2 * 20}% ${40 + r3 * 20}%, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 65%, 45%), hsl(${hue3}, 60%, 50%), hsl(${hue1}, 70%, 55%))`,
		].join(", ");
	} else if (variant === 2) {
		// Diamond mesh
		const size1 = 30 + r1 * 40;
		background = [
			`radial-gradient(ellipse ${size1}% 120% at ${r2 * 100}% ${r3 * 100}%, hsl(${hue1}, 75%, 55%) 0%, transparent 70%)`,
			`radial-gradient(ellipse 120% ${size1}% at ${r4 * 100}% ${r1 * 100}%, hsl(${hue2}, 70%, 50%) 0%, transparent 70%)`,
			`linear-gradient(${45 + r2 * 90}deg, hsl(${hue3}, 50%, 30%), hsl(${hue1}, 45%, 22%))`,
		].join(", ");
	} else {
		// Split blocks
		const angle = Math.round(r1 * 180);
		background = [
			`linear-gradient(${angle}deg, hsl(${hue1}, 70%, 50%) 0%, hsl(${hue1}, 70%, 50%) 33%, transparent 33%)`,
			`linear-gradient(${angle + 120}deg, hsl(${hue2}, 65%, 45%) 0%, hsl(${hue2}, 65%, 45%) 33%, transparent 33%)`,
			`linear-gradient(${angle + 240}deg, hsl(${hue3}, 60%, 40%) 0%, hsl(${hue3}, 60%, 40%) 50%, hsl(${(hue3 + 60) % 360}, 50%, 30%) 100%)`,
		].join(", ");
	}

	return <div className={`avatar${size === "sm" ? " avatar--sm" : ""}`} style={{ background }} />;
}
