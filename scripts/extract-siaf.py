#!/usr/bin/env python3
"""
Extract WFI SIAF data from pysiaf into a static JSON file.

This script is run once during development to produce src/data/wfi_siaf.json.
The output JSON is committed to the repository so the web app never needs
pysiaf at runtime.

Usage:
    pip install pysiaf
    python scripts/extract-siaf.py

Output:
    src/data/wfi_siaf.json
"""

import json
import os
import pysiaf

def main():
    siaf = pysiaf.Siaf('Roman')

    data = {
        "meta": {
            "source": "pysiaf",
            "pysiaf_version": pysiaf.__version__,
            "instrument": "Roman WFI",
            "description": "SIAF data for 18 WFI SCAs, extracted from pysiaf for use in RomanView observation planner",
        },
        "boresight": {},
        "detectors": {},
    }

    # WFI center (boresight reference for pointing)
    # This is where the target lands when you "point" the telescope
    wfi_cen = siaf['WFI_CEN']
    data["boresight"] = {
        "v2": float(wfi_cen.V2Ref),
        "v3": float(wfi_cen.V3Ref),
    }

    for i in range(1, 19):
        name = f'WFI{i:02d}_FULL'
        ap = siaf[name]

        # Get corner coordinates in V2V3 (telescope frame)
        # closed_polygon_points returns 5 points (closed polygon), take first 4
        v2_corners, v3_corners = ap.closed_polygon_points('tel')

        data["detectors"][f"WFI{i:02d}"] = {
            "v2Ref": float(ap.V2Ref),
            "v3Ref": float(ap.V3Ref),
            "v3IdlYAngle": float(ap.V3IdlYAngle),
            "vIdlParity": int(ap.VIdlParity),
            "xSciScale": float(ap.XSciScale),
            "ySciScale": float(ap.YSciScale),
            "xDetSize": int(ap.XDetSize),
            "yDetSize": int(ap.YDetSize),
            "corners_v2v3": [
                [round(float(v2_corners[j]), 4), round(float(v3_corners[j]), 4)]
                for j in range(4)
            ],
        }

    # Write output
    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'src', 'data', 'wfi_siaf.json'
    )
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Extracted {len(data['detectors'])} detectors to {output_path}")
    print(f"Boresight: V2={data['boresight']['v2']:.4f}, V3={data['boresight']['v3']:.4f}")

    # Print summary
    for det_id, det in sorted(data["detectors"].items()):
        print(f"  {det_id}: V2Ref={det['v2Ref']:.2f}, V3Ref={det['v3Ref']:.2f}, "
              f"V3IdlYAngle={det['v3IdlYAngle']:.1f}, VIdlParity={det['vIdlParity']}")


if __name__ == '__main__':
    main()
