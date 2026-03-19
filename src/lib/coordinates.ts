import * as THREE from 'three';

/** Convert RA (degrees) and Dec (degrees) to a unit-sphere Cartesian position */
export function raDecToCartesian(raDeg: number, decDeg: number, radius = 1): THREE.Vector3 {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  return new THREE.Vector3(
    radius * Math.cos(dec) * Math.cos(ra),
    radius * Math.sin(dec),
    -radius * Math.cos(dec) * Math.sin(ra)
  );
}

/** Convert Cartesian position back to RA/Dec in degrees */
export function cartesianToRaDec(pos: THREE.Vector3): { ra: number; dec: number } {
  const r = pos.length();
  const dec = Math.asin(pos.y / r);
  let ra = Math.atan2(-pos.z, pos.x);
  if (ra < 0) ra += 2 * Math.PI;
  return {
    ra: THREE.MathUtils.radToDeg(ra),
    dec: THREE.MathUtils.radToDeg(dec),
  };
}

/** Angular separation between two sky positions in degrees */
export function angularSeparation(
  ra1Deg: number, dec1Deg: number,
  ra2Deg: number, dec2Deg: number
): number {
  const ra1 = THREE.MathUtils.degToRad(ra1Deg);
  const dec1 = THREE.MathUtils.degToRad(dec1Deg);
  const ra2 = THREE.MathUtils.degToRad(ra2Deg);
  const dec2 = THREE.MathUtils.degToRad(dec2Deg);

  const cosAngle =
    Math.sin(dec1) * Math.sin(dec2) +
    Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);

  return THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.max(-1, cosAngle))));
}

/** Format RA in HMS string */
export function formatRA(raDeg: number): string {
  const h = raDeg / 15;
  const hours = Math.floor(h);
  const m = (h - hours) * 60;
  const minutes = Math.floor(m);
  const seconds = (m - minutes) * 60;
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toFixed(1).padStart(4, '0')}s`;
}

/** Format Dec in DMS string */
export function formatDec(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const d = Math.abs(decDeg);
  const degrees = Math.floor(d);
  const m = (d - degrees) * 60;
  const minutes = Math.floor(m);
  const seconds = (m - minutes) * 60;
  return `${sign}${degrees.toString().padStart(2, '0')}° ${minutes.toString().padStart(2, '0')}' ${seconds.toFixed(1).padStart(4, '0')}"`;
}

/** Convert ecliptic longitude/latitude to RA/Dec (approximate, J2000 obliquity) */
export function eclipticToEquatorial(lonDeg: number, latDeg: number): { ra: number; dec: number } {
  const eps = THREE.MathUtils.degToRad(23.4393); // J2000 obliquity
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);

  const sinDec = Math.sin(lat) * Math.cos(eps) + Math.cos(lat) * Math.sin(eps) * Math.sin(lon);
  const dec = Math.asin(sinDec);

  const y = Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps);
  const x = Math.cos(lon);
  let ra = Math.atan2(y, x);
  if (ra < 0) ra += 2 * Math.PI;

  return {
    ra: THREE.MathUtils.radToDeg(ra),
    dec: THREE.MathUtils.radToDeg(dec),
  };
}

/** Color index (B-V) to RGB color for star rendering */
export function colorIndexToColor(ci: number): THREE.Color {
  // Attempt to map B-V color index to approximate RGB
  // Based on Ballesteros' formula (approximation)
  const t = 4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62));

  // Temperature to RGB (simplified blackbody)
  let r: number, g: number, b: number;

  if (t <= 6600) {
    r = 1;
    g = Math.max(0, Math.min(1, 0.39 * Math.log(t / 100) - 0.634));
    if (t <= 1900) {
      b = 0;
    } else {
      b = Math.max(0, Math.min(1, 0.543 * Math.log(t / 100 - 10) - 1.185));
    }
  } else {
    r = Math.max(0, Math.min(1, 1.292 * Math.pow(t / 100 - 60, -0.1332)));
    g = Math.max(0, Math.min(1, 1.129 * Math.pow(t / 100 - 60, -0.0755)));
    b = 1;
  }

  return new THREE.Color(r, g, b);
}
