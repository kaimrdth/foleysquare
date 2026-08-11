import type { LatLngLiteral } from "../types";

export const FEET_TO_METERS = 0.3048;
export const TABLE_WIDTH_METERS = 6 * FEET_TO_METERS;
export const TABLE_DEPTH_METERS = 2.5 * FEET_TO_METERS;

export function normalizeDegrees(degrees: number) {
  return ((Math.round(degrees) % 360) + 360) % 360;
}

export function getTableCorners({
  center,
  widthMeters,
  depthMeters,
  rotation,
}: {
  center: LatLngLiteral;
  widthMeters: number;
  depthMeters: number;
  rotation: number;
}) {
  const halfWidth = widthMeters / 2;
  const halfDepth = depthMeters / 2;
  const diagonal = Math.hypot(halfWidth, halfDepth);
  const cornerAngle = (Math.atan2(halfWidth, halfDepth) * 180) / Math.PI;
  const centerLatLng = new google.maps.LatLng(center.lat, center.lng);
  const offsets = [
    rotation + cornerAngle,
    rotation + 180 - cornerAngle,
    rotation + 180 + cornerAngle,
    rotation + 360 - cornerAngle,
  ];

  return offsets.map((heading) => {
    const point = google.maps.geometry.spherical.computeOffset(centerLatLng, diagonal, heading);
    return { lat: point.lat(), lng: point.lng() };
  });
}
