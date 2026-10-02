// User motion spec: scalar temporal Bezier, time in seconds and value in 0..100.
// Keep the supplied time/value control points rather than rounded CSS coordinates.
// Play the supplied curve at half speed for a softer descent.
export const INTRO_CAMERA_DURATION_MS = 2400;
const POINTS = [[0, 0], [0.694969, 0.538041], [0.474817, 102.905376], [1.2, 100]];

function cubic(u, axis) {
  const v = 1 - u;
  return v ** 3 * POINTS[0][axis] + 3 * v * v * u * POINTS[1][axis]
    + 3 * v * u * u * POINTS[2][axis] + u ** 3 * POINTS[3][axis];
}

function derivative(u, axis) {
  const v = 1 - u;
  return 3 * v * v * (POINTS[1][axis] - POINTS[0][axis])
    + 6 * v * u * (POINTS[2][axis] - POINTS[1][axis])
    + 3 * u * u * (POINTS[3][axis] - POINTS[2][axis]);
}

export function sampleIntroCameraMotion(progress) {
  const t = Math.min(1, Math.max(0, progress));
  let u = t;
  if (t > 0 && t < 1) {
    let low = 0;
    let high = 1;
    // Invert the time coordinate: Bezier parameter u is not wall-clock progress.
    for (let i = 0; i < 48; i += 1) {
      u = (low + high) / 2;
      if (cubic(u, 0) < t * 1.2) low = u;
      else high = u;
    }
    u = (low + high) / 2;
  }
  return {
    value: t === 0 ? 0 : t === 1 ? 1 : cubic(u, 1) / 100,
    // d(normalized value)/d(normalized time), reused by motion blur.
    velocity: progress < 0 || progress > 1 ? 0 : derivative(u, 1) / derivative(u, 0) * 1.2 / 100,
  };
}
