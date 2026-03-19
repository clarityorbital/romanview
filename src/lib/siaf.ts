/**
 * SIAF (Science Instrument Aperture File) data and accessors for Roman WFI.
 *
 * This module provides typed access to pre-extracted SIAF data for all 18 WFI
 * detectors. The data was extracted from pysiaf and stored as static JSON.
 *
 * Coordinate system:
 * - V2/V3 are telescope frame coordinates in arcseconds
 * - V2Ref/V3Ref is the reference point (center) of each detector
 * - corners_v2v3 are the 4 detector corners in V2/V3 arcseconds
 * - V3IdlYAngle is the angle from V3 to the detector Y-axis (-60 deg for all WFI detectors)
 */

import siafData from '../data/wfi_siaf.json';

export interface SIAFDetector {
  id: string;
  v2Ref: number;       // arcseconds
  v3Ref: number;       // arcseconds
  v3IdlYAngle: number; // degrees
  vIdlParity: number;  // +1 or -1
  xSciScale: number;   // arcsec/pixel
  ySciScale: number;   // arcsec/pixel
  xDetSize: number;    // pixels
  yDetSize: number;    // pixels
  corners_v2v3: [number, number][]; // 4 corners in V2V3 arcsec
}

export interface SIAFBoresight {
  v2: number;  // arcseconds
  v3: number;  // arcseconds
}

/**
 * Get all 18 WFI detectors with their SIAF data.
 */
export function getAllDetectors(): SIAFDetector[] {
  return Object.entries(siafData.detectors).map(([id, det]) => ({
    id,
    ...(det as Omit<SIAFDetector, 'id'>),
  }));
}

/**
 * Get a specific detector by ID (e.g., "WFI01").
 * Returns undefined if the detector ID is not found.
 */
export function getDetector(id: string): SIAFDetector | undefined {
  const det = (siafData.detectors as Record<string, Omit<SIAFDetector, 'id'>>)[id];
  if (!det) return undefined;
  return { id, ...det };
}

/**
 * Get the WFI boresight (WFI_CEN) V2/V3 position.
 * This is where the observation target lands on the focal plane.
 */
export function getBoresight(): SIAFBoresight {
  return siafData.boresight as SIAFBoresight;
}

/** FPA rotation angle (V3IdlYAngle) in degrees -- same for all WFI detectors */
export const FPA_ROTATION_DEG = -60.0;
