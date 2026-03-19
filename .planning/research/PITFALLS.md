# Domain Pitfalls

**Domain:** Browser-based astronomy observation planner (Roman Space Telescope WFI)
**Researched:** 2026-03-19

---

## Critical Pitfalls

Mistakes that cause broken features, silent data errors, or fundamental rework.

---

### Pitfall 1: TAPVizieR Column Names Differ from ESA Gaia Archive

**What goes wrong:** The existing `vizier.ts` queries Gaia DR3 via TAPVizieR using ESA Gaia Archive column names (`ra`, `dec`, `phot_g_mean_mag`), but TAPVizieR uses VizieR-standard column names (`RAJ2000`, `DEJ2000`, `Gmag`). The query silently returns an XML error document instead of JSON data.

**Why it happens:** Developers test ADQL queries against ESA's Gaia Archive (gea.esac.esa.int) documentation, then point the fetch at TAPVizieR (tapvizier.cds.unistra.fr) which wraps the same data in VizieR's own schema. The column names in VizieR's copy of Gaia DR3 (`I/355/gaiadr3`) differ from the native ESA table (`gaiadr3.gaia_source`).

**Consequences:** Every Gaia cone search returns zero results. The query returns XML (not JSON) with error status, and the current code's `response.json()` call will throw. The app shows no stars around any target.

**Evidence:** Verified empirically -- `SELECT ra, dec, phot_g_mean_mag FROM "I/355/gaiadr3"` returns "Unknown column" errors. The correct query uses `RAJ2000, DEJ2000, Gmag`.

**Prevention:**
- Use the correct TAPVizieR column names: `RAJ2000`, `DEJ2000`, `Gmag` (or `RPmag`, `BPmag` for color)
- Validate the response Content-Type header before calling `.json()` -- TAPVizieR returns `application/xml` on errors
- Add integration tests that execute a small cone search against TAPVizieR during development
- Consider querying TAP_SCHEMA.columns at build time to verify column availability

**Detection:** Any attempt to use the Gaia cone search feature will fail immediately. Check network tab for XML error responses.

**Confidence:** HIGH -- verified by direct API testing.

**Phase relevance:** Must be fixed in the phase that integrates live Gaia queries.

---

### Pitfall 2: TAPVizieR Gaia Coordinates Are Propagated to J2000 Epoch, Not Gaia's Native Epoch

**What goes wrong:** TAPVizieR's `RAJ2000` and `DEJ2000` columns contain positions propagated back to epoch J2000.0 using Gaia proper motions. These differ from the native Gaia DR3 positions (epoch 2016.0) by up to several arcseconds for high-proper-motion stars. Mixing J2000-epoch TAPVizieR positions with other catalogs or computations that assume epoch 2016.0 creates subtle position mismatches.

**Why it happens:** VizieR standardizes all catalog positions to J2000 for cross-matching convenience. Developers assume "Gaia data" means "Gaia epoch" regardless of which service they query. The difference is small enough (sub-arcsecond for most stars) to go unnoticed during casual testing, but becomes visible for fast-moving stars like Barnard's Star (10+ arcsec offset).

**Consequences:** High-proper-motion stars appear in the wrong position on the focal plane. For the WFI's 0.11"/pixel scale, a 1" error is about 9 pixels -- significant for guide star selection and target placement accuracy.

**Prevention:**
- Document which epoch the coordinates are in and be consistent throughout the app
- For a planning tool (not astrometry), J2000-epoch positions from TAPVizieR are acceptable for most targets, but add a note/disclaimer about proper motion
- If epoch-current positions are needed, either: (a) query the native ESA Gaia Archive (but see Pitfall 3 about CORS), or (b) request proper motion columns (`pmRA`, `pmDE`) from TAPVizieR and propagate to the observation epoch yourself
- For the WFI's ~47' FOV, the sub-arcsecond differences are invisible in the star overlay for the vast majority of stars

**Detection:** Compare positions of Barnard's Star or Proxima Centauri between your display and a known-current catalog. Large discrepancies indicate epoch mismatch.

**Confidence:** HIGH -- verified from TAPVizieR column metadata: "Barycentric right ascension (ICRS) at Ep=2000.0 (added by CDS)".

**Phase relevance:** Acceptable for initial Gaia integration (planning accuracy is sufficient with J2000), but should be documented. If sub-arcsecond accuracy is ever needed, this must be addressed.

---

### Pitfall 3: ESA Gaia TAP Archive Has No CORS Headers -- Cannot Use from Browser

**What goes wrong:** The ESA Gaia Archive at `gea.esac.esa.int` does NOT send `Access-Control-Allow-Origin` headers. Browser `fetch()` calls from a different origin are silently blocked. Developers test with curl or Python (which ignore CORS) and assume the same endpoint works from JavaScript in the browser.

**Why it happens:** CORS is a browser-side security mechanism. Server-side tools bypass it entirely, so the API appears to work in all testing environments except the actual browser deployment.

**Consequences:** If the app is pointed at the ESA Gaia TAP endpoint instead of CDS TAPVizieR, every query fails with a CORS error. The user sees no stars and gets no useful error message.

**Evidence:** Verified empirically -- `curl -sI -H "Origin: https://romanview.netlify.app" "https://gea.esac.esa.int/tap-server/tap/sync"` returns `X-Frame-Options: SAMEORIGIN` with no `Access-Control-Allow-Origin` header.

**Prevention:**
- Use CDS TAPVizieR (`tapvizier.cds.unistra.fr`) which returns `Access-Control-Allow-Origin: *` -- verified
- Use CDS SIMBAD TAP (`simbad.cds.unistra.fr`) which returns `Access-Control-Allow-Origin: *` -- verified
- Use CDS Sesame (`cdsweb.u-strasbg.fr`) which returns `Access-Control-Allow-Origin: *` -- verified
- NEVER use ESA's direct Gaia archive from browser code without a proxy
- Add explicit CORS error detection: if a fetch fails with a TypeError and no response body, it is almost certainly CORS

**Detection:** Open browser DevTools Network tab; look for blocked requests with "(CORS error)" or "blocked by CORS policy" messages.

**Confidence:** HIGH -- verified by direct HTTP header inspection of all four endpoints.

**Phase relevance:** Relevant from the very first phase that touches external API calls. The current code already uses the correct CDS endpoints, but this pitfall prevents any temptation to switch to "more official" ESA endpoints.

---

### Pitfall 4: WFI Focal Plane Is NOT Centered on Boresight and Is Rotated 60 Degrees

**What goes wrong:** The current `wfi_geometry.json` models the WFI as a simple 3x6 grid centered on the boresight (V1 axis) with no rotation. In reality, the WFI focal plane center is offset by 0.496 degrees (approximately 30 arcmin) from the V1 axis, and the FPA is rotated 60 degrees from the -V3 axis. The current simplified model places detectors in approximately the right relative positions but at the wrong absolute sky positions.

**Why it happens:** The simplified grid model is intuitive and visually reasonable. The offset and rotation are buried in technical documentation (Roman Coordinate Systems page, pysiaf). Most developers treat the boresight as "the center of the instrument" -- true for JWST NIRCam, but not for Roman WFI.

**Consequences:**
- Target placement errors of ~30 arcmin -- a star you think is on SCA09 might actually be on SCA03 or off the focal plane entirely
- Position angle rotation is wrong because the PA rotates around V1 (boresight), not the WFI center
- The inter-detector gap pattern is approximately correct in relative terms but the absolute sky coverage is shifted

**Prevention:**
- Source detector positions from pysiaf's V2/V3 reference values for each SCA (e.g., WFI01_FULL has V2Ref=1312.95", V3Ref=-1040.79")
- Apply the full V2V3-to-sky transformation: attitude matrix from (V2Ref, V3Ref, target_RA, target_Dec, V3PA)
- For a planning tool, an acceptable simplification is to use the WFI_CEN aperture's V2/V3 as the pointing center (not V1 axis) and position detectors relative to that
- Document the simplification level explicitly so users understand the accuracy

**Detection:** Compare footprint overlay against APT (Astronomer's Proposal Tool) or pysiaf output for the same target and PA. If detectors are shifted by ~30', the boresight offset is missing.

**Confidence:** HIGH -- documented at roman-docs.stsci.edu/data-handbook-home/wfi-data-format/coordinate-systems.

**Phase relevance:** Must be addressed in the WCS-accurate footprint phase. This is the single most impactful geometry fix.

---

### Pitfall 5: WFI SCA Numbering Does Not Follow Simple Row-Major Order

**What goes wrong:** The current `wfi_geometry.json` assigns SCAs to a simple row/column grid (SCA01 at row 0, col 0 through SCA18 at row 2, col 5). The actual WFI SCA numbering follows a column-major-like pattern where detectors in the top two rows are physically "upside-down" (flipped in the Y direction) relative to the third row. The SCU (Sensor Control Unit) numbering runs column-by-column, not row-by-row.

**Why it happens:** The Roman project uses SCU numbers 1-18 where the numbering runs down columns (1,2,3 in column 1; 4,5,6 in column 2; etc.), which is different from a row-major grid. Additionally, individual SCAs have different readout orientations depending on their row.

**Consequences:**
- "SCA09" in the app might correspond to the wrong physical detector
- Users comparing the app's focal plane to official NASA diagrams will see mismatched detector labels
- Any per-SCA operations (filter assignments, readout modes) will reference the wrong detector

**Prevention:**
- Extract the authoritative SCA layout from pysiaf or the Roman WFI documentation
- The SCU numbering convention is: SCU 1-3 in column 1, SCU 4-6 in column 2, etc., reading top-to-bottom within each column
- Store both SCU number and SCA serial number for each detector
- Add detector orientation metadata (which rows are flipped) for accurate sub-detector coordinate transforms

**Detection:** Compare the app's focal plane SCA labels against the official NASA WFI focal plane diagram.

**Confidence:** MEDIUM -- the column-major numbering is documented in NASA materials, but the exact row-by-row flip convention needs verification against pysiaf data for the current cycle.

**Phase relevance:** Must be addressed alongside the WCS footprint work. Incorrect numbering undermines trust in the entire tool.

---

### Pitfall 6: Position Angle Convention Confusion (V3PA vs Aperture PA vs Sky PA)

**What goes wrong:** The current code computes the position angle as the bearing from the target toward the Sun (East of North). This is the astronomical position angle convention (IAU standard). However, the Roman mission uses V3PA -- the position angle of the V3 axis on the sky, measured counterclockwise from North. The relationship between V3PA and the WFI orientation on the sky involves the 60-degree FPA rotation. Conflating these produces a ~60-degree rotation error in the focal plane display.

**Why it happens:** There are at least three distinct "position angle" concepts in play:
1. **Astronomical PA (sky PA):** The angle from North toward East to a reference direction -- this is what `positionAngle()` in `coordinates.ts` computes
2. **V3PA:** The position angle of the V3 spacecraft axis on the sky, which is what the attitude control system uses
3. **Aperture PA (APA):** The position angle of a specific instrument aperture (WFI_CEN) on the sky, which includes the 60-degree FPA rotation offset from V3

The WFI focal plane orientation on the sky = V3PA + FPA rotation offset. The current code skips the FPA rotation entirely.

**Consequences:**
- The focal plane display is rotated ~60 degrees from reality
- The N/E compass arrows in the focal plane view point in wrong directions
- Stars projected onto the focal plane land on the wrong detectors

**Prevention:**
- Compute V3PA from the Sun constraint geometry (the Sun-constrained roll places V3 roughly toward the Sun)
- Apply the WFI FPA rotation offset (approximately 60 degrees from -V3) to get the aperture PA
- Use pysiaf's `AperPA = V3PA + V3IdlYAngle` formula to derive the correct aperture PA for each SCA
- Validate against pysiaf by computing the sky footprint for a known target/date and comparing

**Detection:** Display the compass rose (N/E arrows) and compare against Aladin or another WCS-aware viewer for the same field. If N/E are rotated by a large fixed angle, the FPA rotation offset is missing.

**Confidence:** HIGH -- the 60-degree rotation is documented in Roman coordinate systems documentation and is consistent with the V2/V3 frame definition.

**Phase relevance:** Must be addressed alongside the WCS footprint phase. This is tightly coupled to Pitfall 4.

---

## Moderate Pitfalls

Mistakes that cause degraded functionality, poor UX, or incorrect but non-critical results.

---

### Pitfall 7: Gnomonic Projection Breaks for Stars Far from Boresight

**What goes wrong:** The gnomonic (TAN) projection in `FocalPlaneView.tsx` divides by `cosC`, which approaches zero for objects 90 degrees from the tangent point and is negative for objects on the far side of the sky. The current code correctly guards `cosC <= 0`, but the projection distortion grows rapidly beyond ~10 degrees from center, producing visually misleading star positions at the FOV edges.

**Why it happens:** The gnomonic projection maps great circles to straight lines, which is geometrically exact for small angles but introduces tangent-function scaling that grows without bound. For the WFI's ~0.8 degree FOV, this is a non-issue for the focal plane itself, but the pre-filter in the code uses a 1-degree RA/Dec box filter that could admit stars up to ~1.4 degrees away (diagonal), where distortion starts to become noticeable.

**Consequences:**
- Stars at the very edge of the padded FOV display are slightly misplaced (sub-pixel for WFI's small FOV)
- If the FOV is ever expanded (e.g., showing context around the WFI), distortion becomes visible
- Near celestial poles, the RA pre-filter (`dRa > 1`) is incorrect because 1 degree of RA spans much less sky at high declinations

**Prevention:**
- For the WFI's 0.8-degree FOV, gnomonic projection is accurate to better than 0.01" -- this is a non-issue for the current use case
- Fix the RA pre-filter to account for declination: `dRa > 1/cosDec` (or use angular separation directly)
- If implementing a wider sky view, switch to an appropriate projection (e.g., orthographic or stereographic) beyond ~5 degrees
- Add a maximum angular distance check (not just RA/Dec box) as the primary filter

**Detection:** Point at a target near Dec = +89 or -89 degrees. If stars are missing from one side of the FOV, the RA pre-filter is too aggressive at high declination.

**Confidence:** HIGH -- mathematical properties of gnomonic projection are well-established. The RA pre-filter bug at high declination is confirmed by code inspection (line 103-104 of FocalPlaneView.tsx).

**Phase relevance:** The RA pre-filter bug should be fixed during the Gaia integration phase. The projection itself is fine for WFI's FOV.

---

### Pitfall 8: RA Wrap-Around at 0/360 Degrees

**What goes wrong:** The FocalPlaneView pre-filter checks `dRa > 1 && dRa < 359` to handle RA wrap-around, but the Gaia cone search query in `vizier.ts` constructs an ADQL `CIRCLE` constraint that handles wrap-around internally (the `CONTAINS(POINT, CIRCLE)` ADQL function is RA-aware). The inconsistency means the local filter may discard stars near RA=0/360 that the server correctly returned.

**Why it happens:** RA is a cyclic coordinate (0 = 360 degrees), but simple arithmetic treats them as different values. A target at RA=359.5 degrees and a star at RA=0.5 degrees are only 1 degree apart, but `Math.abs(359.5 - 0.5) = 359`, which the pre-filter interprets as very far away. The current code has a partial fix (`dRa < 359`) but the logic is fragile.

**Consequences:**
- Stars near the RA=0/360 boundary may be filtered out of the focal plane display
- Affects targets near RA=0h (the vernal equinox direction), which includes parts of Pisces and Andromeda

**Prevention:**
- Compute RA difference as: `let dRa = Math.abs(ra - targetRa); if (dRa > 180) dRa = 360 - dRa;`
- Better yet, replace the RA/Dec box pre-filter with an angular separation pre-filter (Vincenty or Haversine)
- The gnomonic projection itself handles wrap-around correctly (it works in radians via trig functions), so only the pre-filter needs fixing

**Detection:** Search for a target near RA=0h (e.g., RA=0.5 deg) and check if stars at RA=359.5 appear in the focal plane view.

**Confidence:** HIGH -- confirmed by code inspection.

**Phase relevance:** Should be fixed during Gaia integration (when real star positions replace the static catalog).

---

### Pitfall 9: CDS Service Outages and Rate Limiting Without Graceful Degradation

**What goes wrong:** CDS services (SIMBAD, Sesame, TAPVizieR) are research infrastructure with no SLA. They experience periodic maintenance windows, occasional outages, and can be slow under heavy load. The current code has no retry logic, no timeout configuration, and returns null/throws on any failure.

**Why it happens:** Astronomy API services are designed for research use, not production web applications. The CDS does not publish rate limits, but anecdotal evidence from the community suggests they throttle aggressive clients. There is no documented rate limit, but sustained high-frequency requests from a single IP may be temporarily blocked.

**Consequences:**
- Users see blank target searches during CDS maintenance
- No distinction between "target not found" and "service unavailable"
- Rapid typing in the search box fires many concurrent requests, potentially triggering throttling
- No caching means the same target is re-resolved on every search

**Prevention:**
- Add request timeouts (5-10 seconds for name resolution, 15-30 seconds for cone searches)
- Implement exponential backoff retry (2-3 attempts with 1s, 2s, 4s delays)
- Cache successful results in localStorage or sessionStorage keyed by target name / cone search parameters
- Debounce search input (already partially implemented but needs cleanup)
- Add explicit error states in the UI: "Service unavailable -- try again" vs "Target not found"
- Add a loading state to show queries are in progress
- Bundle a fallback catalog (e.g., the existing `hyg_bright.json`) for when TAPVizieR is unreachable
- Rate-limit outgoing requests to max 1 per second to avoid triggering any throttling

**Detection:** Test the app with network throttling enabled (DevTools > Network > Slow 3G). Check behavior when CDS returns 5xx errors.

**Confidence:** MEDIUM -- CDS CORS support is confirmed, but rate limiting behavior is undocumented and based on community reports.

**Phase relevance:** Must be built into the Gaia integration and SIMBAD integration phases from the start.

---

### Pitfall 10: Rendering 10K+ Stars as Individual SVG Elements Kills Performance

**What goes wrong:** The current `FocalPlaneView` renders each star as an individual SVG `<circle>` element. With the bright star catalog (~few hundred visible stars per field), this works fine. When switching to Gaia queries that return 500-5000 stars per field, React's reconciliation of thousands of SVG elements causes visible frame drops, especially on lower-end devices.

**Why it happens:** SVG is convenient for the focal plane overlay (it scales cleanly, supports easy hit testing, and integrates with React's declarative model). But each SVG element is a DOM node, and DOM manipulation at 1000+ nodes becomes a bottleneck -- especially when the star array changes on every target/PA update.

**Consequences:**
- Focal plane view becomes sluggish with 500+ Gaia sources
- PA slider interaction feels laggy because every PA change triggers re-projection and DOM reconciliation of all stars
- Memory usage grows linearly with star count

**Prevention:**
- For 500-2000 stars: render all stars as a single `<path>` element using SVG path data (e.g., one arc per star) -- single DOM node, React only diffs one string
- For 2000+ stars: switch the star layer to a `<canvas>` element overlaid on the SVG detector grid. Canvas can draw 10K+ circles per frame at 60fps
- Keep detectors as SVG (they're only 18 elements and benefit from DOM interactivity)
- Alternatively, use InstancedMesh in Three.js for the 3D sky view (already using Three.js) and project to 2D for the focal plane -- a single draw call handles 200K+ instances
- Memoize the projected star positions and only recalculate when target or PA actually changes (not on every render)

**Detection:** Open Performance tab in DevTools while dragging the PA slider. If scripting time per frame exceeds 16ms, SVG star rendering is the bottleneck.

**Confidence:** HIGH -- well-established that SVG DOM performance degrades above ~1000 elements; verified by Three.js community benchmarks showing InstancedMesh handles 200K+ objects in a single draw call.

**Phase relevance:** Must be addressed during Gaia integration. The current bright star catalog is small enough that this is not yet a problem.

---

### Pitfall 11: Celestial Pole Singularity in Position Angle and Projection

**What goes wrong:** The `positionAngle()` function uses `atan2()` which becomes numerically unstable when the target is at or very near a celestial pole (Dec near +/-90 degrees). The position angle is mathematically undefined at the pole itself, and jumps discontinuously near it. The gnomonic projection also degrades near poles because `cosDec` approaches zero, causing the RA pre-filter to be far too restrictive.

**Why it happens:** Position angle is defined as the bearing from the target toward a reference direction on the celestial sphere. At the poles, all directions are "south" (or "north"), making the bearing undefined. This is a fundamental coordinate singularity, not a software bug.

**Consequences:**
- For targets within ~1 degree of a pole, the PA jumps erratically
- The focal plane display rotates unexpectedly
- Stars may be missing from the focal plane view due to the RA pre-filter issue (see Pitfall 7)
- Roman can observe near the ecliptic poles (they are in the continuous viewing zone), so this is not just a theoretical concern

**Prevention:**
- Add explicit checks: if `|Dec| > 89 degrees`, display a warning and fall back to a default PA
- For the RA pre-filter at high declination, use: `dRa > searchRadius / Math.cos(targetDec * Math.PI / 180)` with a maximum cap of 180 degrees
- Use angular separation rather than coordinate differences for all proximity checks
- The Gaia ADQL cone search handles poles correctly (the `CIRCLE` function is geodesic-aware), so this is primarily a client-side display issue

**Detection:** Enter a target near the South Ecliptic Pole (RA ~96 deg, Dec ~-66 deg) or the North Ecliptic Pole and observe the PA behavior.

**Confidence:** HIGH -- mathematical singularity; the current code's `cosDec > 0.01` guard (mentioned in CONCERNS.md) only triggers at |Dec| > 89.4 degrees.

**Phase relevance:** The RA pre-filter fix is needed for Gaia integration. The PA singularity is lower priority (Roman's continuous viewing zones are near the ecliptic poles at Dec ~+/-66 degrees, not the celestial poles at Dec +/-90 degrees).

---

## Minor Pitfalls

Issues that cause confusion, minor inaccuracies, or maintenance headaches.

---

### Pitfall 12: SIMBAD TAP ADQL Injection via Target Name

**What goes wrong:** The `resolveName()` function in `simbad.ts` constructs an ADQL query by string interpolation: `WHERE main_id LIKE '%${sanitize(name)}%'`. The `sanitize()` function only strips `'`, `;`, and `\`. ADQL supports additional special characters (`%`, `_` as wildcards in LIKE clauses) that could cause unexpected query behavior.

**Prevention:**
- Prefer `sesameResolve()` over `resolveName()` -- Sesame uses a simple URL parameter, not ADQL
- If ADQL is needed, escape `%` and `_` in user input (ADQL LIKE wildcards)
- The risk is limited because CDS does not allow data modification via ADQL -- worst case is unexpected search results, not data corruption

**Confidence:** MEDIUM -- the sanitization gap is confirmed by code inspection, but exploitation impact is low.

**Phase relevance:** Should be addressed when cleaning up SIMBAD integration, but is not blocking.

---

### Pitfall 13: Mixed Content (HTTP/HTTPS) Blocking on Netlify

**What goes wrong:** Some CDS documentation and older bookmarks reference HTTP (not HTTPS) endpoints. Netlify serves the app over HTTPS. Browsers block mixed content (HTTPS page fetching HTTP resource) without warning -- the fetch simply fails.

**Prevention:**
- Always use HTTPS URLs for all CDS endpoints
- Verified: `https://simbad.cds.unistra.fr`, `https://tapvizier.cds.unistra.fr`, and `https://cdsweb.u-strasbg.fr` all support HTTPS
- Add a URL validation helper that rejects any `http://` API endpoint at build time or in a linter rule
- Note: the Sesame endpoint in the current code uses `https://cdsweb.u-strasbg.fr` which is correct

**Confidence:** HIGH -- HTTPS support verified for all three CDS endpoints.

**Phase relevance:** Relevant whenever adding or modifying API endpoints.

---

### Pitfall 14: Observer Position Hardcoded to Geocenter

**What goes wrong:** The `constraints.ts` file creates a geocenter observer (`new Observer(0, 0, 0)`) for Sun position computation. This is technically correct for computing the geocentric apparent position of the Sun, but astronomy-engine's `Equator()` function with `ofdate=true` and `aberration=true` computes apparent coordinates including aberration -- which is appropriate for a space telescope in a Sun-Earth L2 halo orbit.

**Prevention:**
- For a planning tool, geocentric Sun position is more than accurate enough -- Roman is at L2, which is ~1% of the Sun-Earth distance away from Earth. The Sun position difference between geocenter and L2 is less than 0.01 degrees.
- Document that the tool uses geocentric coordinates, not Roman-specific ephemeris
- If arcsecond-level accuracy is ever needed for the Sun position, an L2 offset could be added, but this is deep in diminishing returns territory

**Confidence:** HIGH -- the geocenter approximation introduces negligible error for constraint calculations.

**Phase relevance:** No action needed. Document the approximation.

---

### Pitfall 15: Sesame Returns XML, Not JSON -- Parsing Is Fragile

**What goes wrong:** The `sesameResolve()` function parses Sesame's XML response using `DOMParser` and queries specific element names (`jradeg`, `jdedeg`, `oname`). If CDS changes the XML schema or adds namespaces, the querySelector calls silently return null and the function returns null -- indistinguishable from "target not found".

**Prevention:**
- Add a check for the XML response structure before extracting values: verify the root element is a Sesame response
- Consider using Sesame's JSON output format if available, or the VOTable format which has a more stable schema
- Log distinct error messages for "valid response, target not found" vs "unexpected response format" vs "network error"
- Cache successful name resolutions in localStorage to reduce dependency on live parsing

**Confidence:** MEDIUM -- the current XML parsing works with today's Sesame responses, but schema stability is not guaranteed.

**Phase relevance:** Should be hardened during SIMBAD integration phase.

---

### Pitfall 16: TAPVizieR Synchronous Query Row Limit and Timeout

**What goes wrong:** TAPVizieR synchronous queries have a practical timeout (undocumented but typically 30-60 seconds) and the current code requests `maxResults=500` which is reasonable. However, if the search radius is large or the field is dense (e.g., galactic center), the server-side query itself may time out before returning results, producing an error that the client code does not handle distinctly from "no results".

**Note on ESA Gaia Archive limits:** ESA's Gaia TAP has documented limits of 60-second timeout and 3,000,000 row limit for anonymous synchronous queries. TAPVizieR limits are similar but not publicly documented.

**Prevention:**
- Keep cone search radius small (0.2-0.5 degrees, matching the WFI FOV)
- Keep maxResults reasonable (500-1000 is fine for visual display)
- Add timeout handling to the fetch call: `AbortController` with a 15-second timeout
- Distinguish timeout errors from empty results in the UI
- For dense fields, consider adding a magnitude limit to the ADQL query (e.g., `AND Gmag < 18`) to reduce server-side processing

**Confidence:** MEDIUM -- row limits are well-documented for ESA; TAPVizieR limits are less clear but similar in practice.

**Phase relevance:** Should be implemented during Gaia integration.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| WCS-accurate footprint | Pitfalls 4, 5, 6 -- boresight offset, SCA numbering, PA convention | Source all geometry from pysiaf V2/V3 reference data; validate against pysiaf output |
| Gaia star queries | Pitfalls 1, 2, 3 -- column names, epoch, CORS | Use TAPVizieR with VizieR column names; test actual query responses early |
| Gaia star rendering | Pitfalls 7, 8, 10, 11 -- projection, wrap-around, SVG perf, poles | Fix RA pre-filter; use Canvas for 500+ stars; add angular separation filter |
| SIMBAD integration | Pitfalls 9, 12, 13, 15 -- outages, injection, HTTPS, XML parsing | Use Sesame (not ADQL), add timeouts/retries/caching, validate HTTPS |
| Position angle display | Pitfalls 6, 11 -- V3PA vs aperture PA, pole singularity | Implement V3PA + FPA offset; add pole proximity warnings |
| General API integration | Pitfall 9 -- rate limiting, graceful degradation | Debounce, cache, retry with backoff, fallback to bundled catalog |

---

## Sources

### Verified by Direct Testing (HIGH confidence)
- CDS SIMBAD TAP CORS: `Access-Control-Allow-Origin: *` -- verified via curl
- CDS TAPVizieR CORS: `Access-Control-Allow-Origin: *` -- verified via curl
- CDS Sesame CORS: `Access-Control-Allow-Origin: *` -- verified via curl
- ESA Gaia TAP NO CORS: no ACAO header -- verified via curl
- TAPVizieR column names: `RAJ2000`, `DEJ2000`, `Gmag` for `I/355/gaiadr3` -- verified via query

### Official Documentation (HIGH confidence)
- [Roman Coordinate Systems](https://roman-docs.stsci.edu/data-handbook-home/wfi-data-format/coordinate-systems) -- V2/V3 frame, FPA offset, rotation
- [PySIAF for Roman](https://roman-docs.stsci.edu/simulation-tools-handbook-home/simulation-development-utilities/pysiaf-for-roman) -- detector apertures, V2/V3 reference values, transformation methods
- [Roman WFI Technical](https://roman.gsfc.nasa.gov/science/WFI_technical.html) -- detector specifications, FOV
- [Gaia Archive FAQ](https://www.cosmos.esa.int/web/gaia-users/archive/faq) -- query limits, timeouts
- [Gnomonic Projection (PixInsight)](https://pixinsight.com/doc/docs/Projections/Projections.html) -- projection accuracy limits
- [ICRS vs J2000](https://aa.usno.navy.mil/faq/ICRS_doc) -- reference frame differences

### Community Sources (MEDIUM confidence)
- [Position Angle Confusion (Telescopius Forum)](https://forum.telescopius.com/t/position-angle-rotation-angle-is-it-backwards/757) -- PA convention disagreements
- [Three.js Star Rendering Performance (EF Map)](https://ef-map.com/blog/threejs-rendering-3d-starfield) -- InstancedMesh benchmarks (200K stars)
- [IAU Position Angle Definition (Wikipedia)](https://en.wikipedia.org/wiki/Position_angle) -- East of North convention
- [Gaia DR3 Epoch](https://gea.esac.esa.int/archive/documentation/GDR2/Data_processing/chap_cu3ast/sec_cu3ast_intro/ssec_cu3ast_intro_tansforms.html) -- epoch 2016.0 coordinates
- [Aladin Lite (CDS)](https://cds-astro.github.io/aladin-lite/) -- reference implementation of browser-based CDS service access

---

*Pitfalls audit: 2026-03-19*
