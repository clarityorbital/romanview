# Quick Task 4: Realistic multi-material Roman telescope model - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Task Boundary

Replace the single-material metallic telescope with a multi-material model featuring distinct colored regions for each spacecraft component. Segment the existing 27MB STL geometry by vertex position into separate material zones.

</domain>

<decisions>
## Implementation Decisions

### Model Source
- Segment the current STL programmatically by vertex position into barrel, sun shield, solar panels, bus, struts
- No external downloads or new model files needed

### Visual Style
- Stylized sci-fi aesthetic — metallic tones, glowing accents, looks great in the dark space scene
- Not strictly NASA-accurate but inspired by real colors (gold tones, blue panels, dark struts)

### Solar Panel Rendering
- Procedural shader for grid/hatch marks — resolution-independent, no texture files
- Mathematical grid pattern in a custom ShaderMaterial

### Claude's Discretion
- Exact color palette tuning for the dark scene aesthetic
- Threshold values for vertex position segmentation
- Shader parameters for solar cell grid pattern density

</decisions>

<specifics>
## Specific Ideas

### Reference Color Palette (NASA-inspired, stylized)
- **Sun Shield/MLI**: Gold/amber reflective with slight emissive glow
- **Solar Panels**: Blue cells with procedural grid lines, slight emissive
- **Barrel/Tube**: Light gray or white with metallic sheen
- **Secondary Mirror Struts**: Black/dark gray matte
- **Spacecraft Bus**: Light aluminum with copper-toned accents
- **Deployment Flaps**: Copper/bronze metallic

### Key Research Findings
- STL model: barrel axis along X, aperture at +X, sun shield at -X
- Wider cross-section (260k vertices, radius 67.4) at -X = sun shield end
- Narrower end (radius 46.7) at +X = aperture end
- Solar panels would be flat structures extending from the spacecraft bus perpendicular to the barrel axis

</specifics>
