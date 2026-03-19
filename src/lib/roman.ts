import { getAllDetectors, getBoresight } from './siaf';

export interface DetectorInfo {
  id: string;               // "WFI01" through "WFI18"
  v2Ref: number;           // arcseconds
  v3Ref: number;           // arcseconds
  v3IdlYAngle: number;     // degrees (-60 for all WFI)
  corners_v2v3: [number, number][]; // 4 corner positions in V2V3 arcsec
}

/** All 18 WFI detectors with SIAF-derived positions */
export const WFI_DETECTORS: DetectorInfo[] = getAllDetectors().map(det => ({
  id: det.id,
  v2Ref: det.v2Ref,
  v3Ref: det.v3Ref,
  v3IdlYAngle: det.v3IdlYAngle,
  corners_v2v3: det.corners_v2v3,
}));

/** WFI boresight (WFI_CEN) V2/V3 position */
export const WFI_BORESIGHT = getBoresight();

/** Pixel scale in arcseconds per pixel */
export const PIXEL_SCALE_ARCSEC = 0.11;

/** Pixels per detector side (H4RG-10) */
export const PIXELS_PER_DETECTOR = 4096;

/**
 * Total FOV extent computed from SIAF detector corner extents.
 * This replaces the old grid-based constants with SIAF-accurate values.
 */
function computeFovFromSiaf(): { widthArcmin: number; heightArcmin: number } {
  const allCorners = WFI_DETECTORS.flatMap(d =>
    d.corners_v2v3.map(([v2, v3]) => ({
      dv2: (v2 - WFI_BORESIGHT.v2) / 60,  // arcminutes
      dv3: (v3 - WFI_BORESIGHT.v3) / 60,
    }))
  );
  const minV2 = Math.min(...allCorners.map(c => c.dv2));
  const maxV2 = Math.max(...allCorners.map(c => c.dv2));
  const minV3 = Math.min(...allCorners.map(c => c.dv3));
  const maxV3 = Math.max(...allCorners.map(c => c.dv3));
  return {
    widthArcmin: maxV2 - minV2,
    heightArcmin: maxV3 - minV3,
  };
}

const siafFov = computeFovFromSiaf();

/** Total FOV extent in arcminutes (SIAF-derived) */
export const TOTAL_FOV_ARCMIN = {
  width: siafFov.widthArcmin,
  height: siafFov.heightArcmin,
};

/** Total FOV extent in degrees (SIAF-derived) */
export const TOTAL_FOV_DEG = {
  width: siafFov.widthArcmin / 60,
  height: siafFov.heightArcmin / 60,
};

/** WFI filter options */
export const WFI_FILTERS = [
  { name: 'F062', wavelength: '0.48-0.76 \u03BCm', description: 'R062 (wide)' },
  { name: 'F087', wavelength: '0.76-0.98 \u03BCm', description: 'Z087' },
  { name: 'F106', wavelength: '0.93-1.19 \u03BCm', description: 'Y106' },
  { name: 'F129', wavelength: '1.13-1.45 \u03BCm', description: 'J129' },
  { name: 'F146', wavelength: '0.93-2.00 \u03BCm', description: 'Wide (F146)' },
  { name: 'F158', wavelength: '1.38-1.77 \u03BCm', description: 'H158' },
  { name: 'F184', wavelength: '1.68-2.00 \u03BCm', description: 'F184' },
  { name: 'F213', wavelength: '1.95-2.30 \u03BCm', description: 'K213' },
  { name: 'GRISM', wavelength: '1.00-1.93 \u03BCm', description: 'Grism spectroscopy' },
  { name: 'PRISM', wavelength: '0.75-1.80 \u03BCm', description: 'Prism spectroscopy' },
] as const;

/** Dither patterns */
export const DITHER_PATTERNS = [
  { name: 'None', points: 1 },
  { name: '2-point', points: 2 },
  { name: '3-point', points: 3 },
  { name: '4-point box', points: 4 },
  { name: '8-point', points: 8 },
] as const;
