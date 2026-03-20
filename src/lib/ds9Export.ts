/**
 * DS9 region file generation for Roman WFI footprint.
 *
 * Generates SAOImageDS9-compatible region files with FK5 polygon regions
 * for all 18 WFI detectors, projected onto the sky at a given pointing
 * and position angle.
 */

import { v2v3ToSky } from './wcs';
import { WFI_DETECTORS, WFI_BORESIGHT } from './roman';

/**
 * Generate DS9 region file text for the WFI footprint.
 *
 * Each detector is represented as a polygon with 4 corners projected
 * from V2V3 coordinates to sky RA/Dec using the WCS engine.
 *
 * @param targetRa  - Target right ascension in degrees
 * @param targetDec - Target declination in degrees
 * @param v3pa      - V3 position angle in degrees (East of North)
 * @returns DS9 region file content as a string
 */
export function generateDS9Regions(
  targetRa: number,
  targetDec: number,
  v3pa: number,
): string {
  const lines: string[] = [];

  // DS9 header
  lines.push('# Region file format: DS9 version 4.1');
  lines.push('global color=cyan dashlist=8 3 width=1 font="helvetica 10 normal roman" select=1 highlite=1 dash=0 fixed=0 edit=1 move=1 delete=1 include=1 source=1');
  lines.push('fk5');

  // Generate polygon for each detector
  for (const detector of WFI_DETECTORS) {
    const skyCorners: Array<{ ra: number; dec: number }> = [];

    for (const [v2, v3] of detector.corners_v2v3) {
      const sky = v2v3ToSky(
        v2, v3,
        WFI_BORESIGHT.v2, WFI_BORESIGHT.v3,
        targetRa, targetDec,
        v3pa,
      );
      skyCorners.push(sky);
    }

    // Format as polygon(ra1,dec1,ra2,dec2,...) # text={WFIxx} color=cyan
    const coordStr = skyCorners
      .map(c => `${c.ra.toFixed(7)},${c.dec.toFixed(7)}`)
      .join(',');

    lines.push(`polygon(${coordStr}) # text={${detector.id}} color=cyan`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Trigger a browser download of a DS9 region file.
 *
 * Creates a Blob from the generated region text and triggers an
 * anchor-click download.
 *
 * @param targetRa   - Target right ascension in degrees
 * @param targetDec  - Target declination in degrees
 * @param v3pa       - V3 position angle in degrees
 * @param targetName - Optional target name for the filename
 */
export function downloadDS9Regions(
  targetRa: number,
  targetDec: number,
  v3pa: number,
  targetName?: string,
): void {
  const text = generateDS9Regions(targetRa, targetDec, v3pa);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;

  const safeName = targetName
    ? targetName.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'target';
  const paStr = Math.round(v3pa).toString();
  a.download = `romanview_${safeName}_pa${paStr}.reg`;

  a.click();
  URL.revokeObjectURL(url);
}
