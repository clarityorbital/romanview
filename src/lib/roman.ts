import wfiData from '../data/wfi_geometry.json';

export interface DetectorInfo {
  id: string;
  row: number;
  col: number;
  centerX: number; // arcminutes from boresight
  centerY: number; // arcminutes from boresight
}

const { detector_size_arcmin, gap_arcmin } = wfiData;
const pitch = detector_size_arcmin + gap_arcmin;

// Center the grid: 6 cols (0-5), 3 rows (0-2)
const colOffset = (5 * pitch) / 2;
const rowOffset = (2 * pitch) / 2;

export const WFI_DETECTORS: DetectorInfo[] = wfiData.detectors.map((d) => ({
  id: d.id,
  row: d.row,
  col: d.col,
  centerX: d.col * pitch - colOffset,
  centerY: d.row * pitch - rowOffset,
}));

export const DETECTOR_SIZE_ARCMIN = detector_size_arcmin;
export const GAP_ARCMIN = gap_arcmin;
export const PIXEL_SCALE_ARCSEC = wfiData.pixel_scale_arcsec;
export const PIXELS_PER_DETECTOR = wfiData.pixels_per_detector;

/** Total FOV extent in arcminutes */
export const TOTAL_FOV_ARCMIN = {
  width: 6 * detector_size_arcmin + 5 * gap_arcmin,
  height: 3 * detector_size_arcmin + 2 * gap_arcmin,
};

/** Total FOV extent in degrees */
export const TOTAL_FOV_DEG = {
  width: TOTAL_FOV_ARCMIN.width / 60,
  height: TOTAL_FOV_ARCMIN.height / 60,
};

/** WFI filter options */
export const WFI_FILTERS = [
  { name: 'F062', wavelength: '0.48-0.76 μm', description: 'R062 (wide)' },
  { name: 'F087', wavelength: '0.76-0.98 μm', description: 'Z087' },
  { name: 'F106', wavelength: '0.93-1.19 μm', description: 'Y106' },
  { name: 'F129', wavelength: '1.13-1.45 μm', description: 'J129' },
  { name: 'F146', wavelength: '0.93-2.00 μm', description: 'Wide (F146)' },
  { name: 'F158', wavelength: '1.38-1.77 μm', description: 'H158' },
  { name: 'F184', wavelength: '1.68-2.00 μm', description: 'F184' },
  { name: 'F213', wavelength: '1.95-2.30 μm', description: 'K213' },
  { name: 'GRISM', wavelength: '1.00-1.93 μm', description: 'Grism spectroscopy' },
  { name: 'PRISM', wavelength: '0.75-1.80 μm', description: 'Prism spectroscopy' },
] as const;

/** Dither patterns */
export const DITHER_PATTERNS = [
  { name: 'None', points: 1 },
  { name: '2-point', points: 2 },
  { name: '3-point', points: 3 },
  { name: '4-point box', points: 4 },
  { name: '8-point', points: 8 },
] as const;
