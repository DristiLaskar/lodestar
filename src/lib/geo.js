// Fit every stop of the trip into a square so the star map stays put while
// you flip between days. Longitude is squeezed by cos(latitude) so shapes
// look right.
export function project(stops, size, pad) {
  const pts = stops.filter((s) => s.lat != null && s.lng != null);
  const pos = new Map();
  if (!pts.length) return pos;
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxLng - minLng) * k, 0.004);
  const spanY = Math.max(maxLat - minLat, 0.004);
  const scale = Math.min((size - pad * 2) / spanX, (size - pad * 2) / spanY);
  const offX = (size - spanX * scale) / 2;
  const offY = (size - spanY * scale) / 2;
  pts.forEach((p) => pos.set(p.id, { x: offX + (p.lng - minLng) * k * scale, y: offY + (maxLat - p.lat) * scale }));
  return pos;
}

// A gentle arc between two points so routes read as flight paths, not wires.
export function arc(a, b, bend = 0.16) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const cx = mx - (b.y - a.y) * bend;
  const cy = my + (b.x - a.x) * bend;
  return { cx, cy, d: `Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}` };
}

export const routePath = (points) =>
  points.length < 2 ? '' : `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ${points.slice(1).map((p, i) => arc(points[i], p).d).join(' ')}`;
