const EARTH_RADIUS_METERS = 6371008.8;

export function distanceMeters(a, b) {
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const deltaLat = rad(b.lat - a.lat);
  const deltaLng = rad(b.lng - a.lng);
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function pathLengthMeters(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceMeters(points[index - 1], points[index]);
  }
  return total;
}

// Fórmula esférica aproximada de área para polígonos pequenos, adequada a medições demonstrativas.
export function polygonAreaSquareMeters(points) {
  if (points.length < 3) return 0;
  const rad = (degrees) => (degrees * Math.PI) / 180;
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += rad(next.lng - current.lng)
      * (2 + Math.sin(rad(current.lat)) + Math.sin(rad(next.lat)));
  }
  return Math.abs((sum * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2).replace('.', ',')} km`;
}

export function formatArea(squareMeters) {
  if (squareMeters < 10000) return `${Math.round(squareMeters).toLocaleString('pt-BR')} m²`;
  return `${(squareMeters / 10000).toFixed(2).replace('.', ',')} ha`;
}