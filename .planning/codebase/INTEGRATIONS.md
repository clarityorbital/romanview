# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**Astronomical Name Resolution:**
- SIMBAD (Strasbourg Astronomical Data Center)
  - Service: Astronomical object name resolver
  - Endpoints:
    - TAP service: `https://simbad.cds.unistra.fr/simbad/sim-tap/sync`
    - Sesame resolver: `https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-ox/SNV`
  - Implementation: `src/lib/simbad.ts`
  - Methods: `resolveName()` for TAP queries, `sesameResolve()` for fast XML-based resolution
  - No authentication required
  - Query format: ADQL (Astronomy Data Query Language)
  - Response format: JSON (TAP) or XML (Sesame)

**Astronomical Catalog Queries:**
- VizieR (Strasbourg Astronomical Data Center)
  - Service: Gaia DR3 star catalog cone search
  - Endpoint: `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`
  - Implementation: `src/lib/vizier.ts` - `gaiaConSearch()`
  - Query format: ADQL with cone search (CONTAINS spatial query)
  - Returns: RA, Dec, G-band magnitude for up to 500 stars
  - No authentication required
  - Query: `SELECT ra, dec, phot_g_mean_mag FROM "I/355/gaiadr3"`

## Data Storage

**Local Storage:**
- Browser localStorage for target list persistence
- Key: `roman-view-targets`
- Implementation: `src/hooks/useTargets.ts`
- Data: JSON array of Target objects (name, RA, Dec, timestamp)
- No backend database

**Embedded Data:**
- Star catalog bundled as JSON: `src/data/hyg_bright.json` (HYG bright star catalog)
- WFI geometry bundled as JSON: `src/data/wfi_geometry.json`
- No runtime fetching of static catalog data

## Authentication & Identity

**Auth Provider:**
- None - Application is fully client-side with no backend authentication
- Public APIs only (SIMBAD, VizieR)

## Fonts & CDN

**Google Fonts (via CDN):**
- Loaded in `index.html`
- Fonts requested:
  - Inter (weights 300, 400, 500, 600, 700)
  - JetBrains Mono (weights 300, 400, 500, 600)
- Preconnect hints for performance optimization

## Monitoring & Observability

**Error Tracking:**
- Not implemented - No external error tracking service configured

**Logging:**
- Client-side console logging only
- No structured logging or log aggregation

## CI/CD & Deployment

**Hosting:**
- Netlify
- Configuration: `netlify.toml`

**Deployment Pipeline:**
- Build command: `npm run build` (runs TypeScript compilation and Vite build)
- Artifacts: Output from `dist/` directory
- Static hosting of SPA with single-page app routing

**Git Repository:**
- GitHub (inferred from .git presence)
- No automated CI/CD pipeline configured beyond Netlify's automatic deployment

## Environment Configuration

**Environment Variables:**
- Not used - Application has no environment-specific configuration
- No `.env` files required
- Build is fully static with no runtime secrets or configuration

**Secrets Management:**
- Not applicable - No backend services or API keys required

## Third-Party Libraries with External Calls

**astronomy-engine:**
- Local library (npm package) - No external network calls
- Pure JavaScript astronomy calculations
- Used in `src/lib/constraints.ts` for sun position ephemeris

## Webhooks & Callbacks

**Incoming:**
- None - No webhooks received

**Outgoing:**
- None - No webhook notifications sent

## Data Flow Summary

**User Input → Processing → Visualization:**
1. User searches for target name → SIMBAD/Sesame API
2. Coordinates received → Stored in browser localStorage
3. VizieR Gaia cone search triggered for visualization
4. All computations (ephemeris, observability) performed client-side with astronomy-engine
5. 3D visualization rendered with Three.js

**No server communication after initial data fetch**

---

*Integration audit: 2026-03-19*
