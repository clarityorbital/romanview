# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code in `src/`

**Secondary:**
- JavaScript - Vite configuration files

## Runtime

**Environment:**
- Node.js - Required for build and development (no specific version pinned in package.json)

**Package Manager:**
- npm - Uses `package-lock.json` for dependency lockfile

## Frameworks

**Core:**
- React 19.2.4 - UI framework with React DOM 19.2.4
- Vite 8.0.1 - Build tool and dev server with HMR
- Three.js 0.183.2 - 3D graphics rendering library

**React 3D/Graphics:**
- @react-three/fiber 9.5.0 - React renderer for Three.js
- @react-three/drei 10.7.7 - Utilities for react-three/fiber
- @react-three/postprocessing 3.0.4 - Post-processing effects for Three.js scenes

**Styling:**
- Tailwind CSS 4.2.2 - Utility-first CSS framework
- @tailwindcss/vite 4.2.2 - Vite plugin for Tailwind integration
- tailwind-merge 3.5.0 - Utility for merging Tailwind classes

**UI Components:**
- lucide-react 0.577.0 - Icon library for React

**Scientific/Astronomy:**
- astronomy-engine 2.1.19 - JavaScript astronomy library for ephemeris calculations

**Utilities:**
- clsx 2.1.1 - Utility for constructing className strings

## Build Tools

**Vite:**
- Configuration: `vite.config.ts`
- Plugin: @vitejs/plugin-react 6.0.1 - React JSX transformation

**TypeScript Compilation:**
- Separate tsconfig files for app (`tsconfig.app.json`) and build tools (`tsconfig.node.json`)
- Build command: `tsc -b && vite build`

## Development Dependencies

**Linting & Code Quality:**
- ESLint 9.39.4 - JavaScript/TypeScript linter
- @eslint/js 9.39.4 - ESLint JavaScript rules
- typescript-eslint 8.57.0 - TypeScript support for ESLint
- eslint-plugin-react-hooks 7.0.1 - React Hooks linting rules
- eslint-plugin-react-refresh 0.5.2 - React Fast Refresh linting

**Type Checking:**
- @types/react 19.2.14 - React type definitions
- @types/react-dom 19.2.3 - React DOM type definitions
- @types/three 0.183.1 - Three.js type definitions
- @types/node 24.12.0 - Node.js type definitions

**Utilities:**
- globals 17.4.0 - Global variables for different environments (browser)

## Configuration Files

**TypeScript:**
- `tsconfig.json` - Root configuration with project references
- `tsconfig.app.json` - Application compilation (ES2023, strict mode, React JSX)
- `tsconfig.node.json` - Build tool compilation

**Build:**
- `vite.config.ts` - Vite build configuration with React and Tailwind plugins

**Linting:**
- `eslint.config.js` - ESLint flat config with recommended rules

**HTML Entry:**
- `index.html` - SPA entry point with module script loading `src/main.tsx`

## Environment & Deployment

**Development:**
- Local dev server with Vite HMR
- Port: Default 5173 (Vite default)

**Production Build:**
- Command: `npm run build`
- Output: `dist/` directory
- Deployment: Netlify (configured in `netlify.toml`)

**Deployment Configuration:**
- Build command: `npm run build`
- Publish directory: `dist/`
- Single-page app redirects: All routes redirect to `/index.html` with 200 status

## Static Assets

**Data Files (bundled):**
- `src/data/hyg_bright.json` - Bright star catalog (1.3 MB) with RA/Dec/magnitude/color index
- `src/data/wfi_geometry.json` - Roman WFI detector geometry and specifications

**Public Assets:**
- `public/favicon.svg` - Application favicon

## CSS & Styling

**Base Styling:**
- `src/index.css` - Root styles and Tailwind directives

**Style Approach:**
- Utility-first with Tailwind CSS
- Component-scoped styling via className attributes

## Browser Support

**Target:**
- Modern ES2023 browsers (Chrome, Firefox, Safari, Edge)
- DOM and DOM.Iterable APIs required for React DOM

---

*Stack analysis: 2026-03-19*
