---
name: Civic Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbeb'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e4efff'
  surface-container-high: '#dee9fa'
  surface-container-highest: '#d8e3f4'
  on-surface: '#111c28'
  on-surface-variant: '#3e4947'
  inverse-surface: '#26313e'
  inverse-on-surface: '#e9f1ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a61'
  primary: '#006057'
  on-primary: '#ffffff'
  primary-container: '#137a70'
  on-primary-container: '#aefff3'
  inverse-primary: '#7ed6ca'
  secondary: '#5845cb'
  on-secondary: '#ffffff'
  secondary-container: '#7160e6'
  on-secondary-container: '#fffbff'
  tertiary: '#4d5660'
  on-tertiary: '#ffffff'
  tertiary-container: '#666e79'
  on-tertiary-container: '#e9f1fe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9af2e6'
  primary-fixed-dim: '#7ed6ca'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c7bfff'
  on-secondary-fixed: '#170065'
  on-secondary-fixed-variant: '#422bb5'
  tertiary-fixed: '#dbe3f0'
  tertiary-fixed-dim: '#bfc7d3'
  on-tertiary-fixed: '#141c25'
  on-tertiary-fixed-variant: '#3f4752'
  background: '#f8f9ff'
  on-background: '#111c28'
  surface-variant: '#d8e3f4'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  title:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies the efficiency, clarity, and uncompromising reliability required for modern public infrastructure and civic workflows. Blending the razor-sharp density of developer tools with the trustworthy calm of institutional technology, it replaces bureaucratic friction with operational velocity.

The aesthetic fuses **Corporate / Modern minimalism** with functional, data-dense utilities. It rejects decorative bloat in favor of purposeful spatial layouts, crisp contrast, structured data visualization, and micro-interactions that feel engineered, responsive, and definitive.

Target audiences include municipal engineers, city directors, and engaged residents. The visual tone must elicit confidence, transparency, and decisive momentum—conveying that every reported civic issue is tracked with algorithmic accuracy and human accountability.

## Colors

The palette balances clinical precision against civic responsibility. 

- **Primary Canvas & Surfaces**: The main canvas operates on `#F5F7FA`, providing a soft, daylight foundation that reduces glare during sustained operational use. Elevated surfaces, cards, and modal canvases rely on pure `#FFFFFF`.
- **Navigation & Structural Rail**: A dense `#151D26` defines persistent vertical navigation and workspace shells, delivering instant spatial anchoring and an enterprise-grade posture.
- **Brand Teal Core**: `#137A70` serves as the primary accent, invoking environmental stewardship and public trust. Interactions shift to `#0F625B` on hover/focus, while `#E8F4F1` provides low-saturation background fills for active states, filter tokens, and selected nodes.
- **AI & Automation Accent**: `#7C6CF2` is reserved strictly for algorithmic interventions—triage suggestions, spatial clustering, automated dispatch, and predictive insights.
- **Typography & Structure**: Deep slate `#18232F` provides accessible, high-contrast readability for headers and primary values. `#667384` drives secondary meta-labels, while `#8B95A5` is dedicated to muted helper copy. Structural boundaries use `#E2E7ED` for cards and controls, with `#EDF0F4` for hairline dividers.
- **Status & Telemetry**:
  - Critical / P1: `#C63F48`
  - In Progress / Warning: `#D97706`
  - Resolved / Nominal: `#198754`
  - Information / Telemetry: `#3478C7`

## Typography

Typography prioritizes tabular clarity, dense data consumption, and neutral precision. 

- **Primary Face**: **Inter** handles all interface copy, headers, and controls. Its neutral character curves and tall x-height guarantee effortless scanning across dense operational matrices.
- **Tabular Numerics**: All numeric figures, timestamps, coordinate values, and civic ticket IDs (`#CVX-9402`) must utilize `font-feature-settings: "tnum" 1, "cv05" 1` to prevent layout reflow during real-time data streaming.
- **Monospace Extension**: **JetBrains Mono** is introduced strictly for raw telemetry feeds, JSON metadata, parcel IDs, and device telemetry.
- **Hierarchy Rules**: Restrict uppercase usage exclusively to micro status indicators (`label-sm`) and table column headers. Avoid decorative display sizing; functional density takes precedence over editorial scale.

## Layout & Spacing

Layouts adhere to an 8-point mathematical grid system with a 4-point micro-step for compact metadata panels, pills, and input padding.

- **Grid Architecture**:
  - **Desktop (1280px+)**: Multi-pane split architecture consisting of a persistent dark navigation rail (64px collapsed or 240px expanded), an optional intermediate triage queue (320px–380px), and a responsive canvas (map viewport, data table, or resolution dashboard) bounded by `1.5rem` gutters.
  - **Tablet (768px - 1279px)**: The navigation collapses into a persistent utility bar or rail; secondary inspection sidebars morph into slide-over sheets.
  - **Mobile (< 768px)**: Unified single-column flow with persistent top app bar, bottom action dock for field verification, and full-bleed list/map switches.
- **Vertical Rhythm**: Maintain strict internal component pacing: `space-xs` (4px) for inline label-icon offsets, `space-sm` (8px) for tightly coupled form elements, `space-md` (16px) for module padding, and `space-xl` (32px) to delineate independent functional modules.

## Elevation & Depth

Visual separation is achieved through structured borders, slight tone shifts, and hyper-diffused ambient depth rather than heavy physical drops.

- **Baseline Surfaces**: Flat canvas (`#F5F7FA`) with surface elements (`#FFFFFF`) grounded by a crisp `1px solid #E2E7ED` border.
- **Level 1 (Cards, Metric Tiles, Table Headers)**: 
  `box-shadow: 0px 1px 2px rgba(24, 35, 47, 0.04);` paired with `#E2E7ED` border.
- **Level 2 (Dropdown Menus, Popovers, Active Worksheets)**:
  `box-shadow: 0px 4px 12px -2px rgba(24, 35, 47, 0.08), 0px 2px 4px -1px rgba(24, 35, 47, 0.04);`
- **Level 3 (Command Palette, Modal Dialogs, Floating Spatial HUDs)**:
  `box-shadow: 0px 12px 32px -4px rgba(24, 35, 47, 0.12), 0px 4px 8px -2px rgba(24, 35, 47, 0.04);`
- **AI Glass Tint**: Interactive AI inspection modules employ a faint white surface backdrop blur (`backdrop-filter: blur(8px)`) with a high-key border: `1px solid rgba(124, 108, 242, 0.25)`.

## Shapes

The geometric framework establishes an intentional hierarchy between containers and interactive triggers:

- **Inputs, Buttons, and Selectors**: Standardize on `8px` to `10px` radius. This maintains an engineered, purposeful profile suitable for fast keyboard/mouse navigation.
- **Cards, Panels, and Map Overlays**: Bound within `10px` to `14px` (`rounded-lg` to `rounded-xl`). The curvature softens the dense data environment while maintaining alignment against tabular grids.
- **Badges, Status Indicators, and Avatars**: Fully rounded pill shapes (`9999px`) to immediately distinguish scalar metadata, severity counters, and tags from actionable rectangular inputs.

## Components

### Buttons & Interactive Triggers
- **Primary Action**: Solid `#137A70` fill, `#FFFFFF` text, `border-radius: 8px`, `height: 36px` (desktop compact) or `40px` (mobile). Hover state transitions to `#0F625B` within 150ms.
- **Secondary / Ghost**: Surface `#FFFFFF`, border `1px solid #E2E7ED`, text `#18232F`. Hover transitions to `#F5F7FA` with border tint `#CBD5E1`.
- **AI Action**: Distinct variant with background `#7C6CF2`, hover `#6C5CE7`, text `#FFFFFF`. Applied exclusively to auto-assignment, clustering, and summarization actions.
- **Field / Destructive**: Background `#FFFFFF`, text `#C63F48`, border `1px solid #F8D7DA`. Hover fills with `#FEF2F2`.

### Inputs & Form Controls
- **Form Fields**: Surface `#FFFFFF`, border `1px solid #E2E7ED`, text `#18232F`, `border-radius: 8px`, `padding: 8px 12px`. Placeholder text set to `#8B95A5`.
- **Focus Rings**: Strict dual-layer ring: `box-shadow: 0 0 0 1px #FFFFFF, 0 0 0 3px rgba(19, 122, 112, 0.25)`.
- **Checkboxes & Radios**: 16px square/circle with `1px solid #CBD5E1`. Checked state transitions instantly to `#137A70` with a sharp white icon/dot.

### Badges & Status Pills
- Compact height (`22px`), `border-radius: 9999px`, `padding: 2px 8px`, text `label-sm`.
- **Resolved**: Background `rgba(25, 135, 84, 0.1)`, text `#198754`, optional 6px solid dot indicator.
- **Pending / Warning**: Background `rgba(217, 119, 6, 0.1)`, text `#B45309`.
- **Critical**: Background `rgba(198, 63, 72, 0.1)`, text `#C63F48`.
- **AI Triage**: Background `rgba(124, 108, 242, 0.12)`, text `#6C5CE7`, accompanied by a minimal spark/node outline glyph.

### Cards & Data Panels
- Surface `#FFFFFF`, border `1px solid #E2E7ED`, radius `12px`.
- Card headers feature subtle border separations using `#EDF0F4`, maintaining clean divisions between metadata summaries, contextual geospatial previews, and thread notes.

### Lists & Dense Data Tables
- Table rows have an explicit height of `44px` with horizontal separators in `#EDF0F4`.
- Alternating hover background `#F8FAFC`.
- Interactive cells use single-line text truncation with inline copy triggers for system IDs and location coordinates.

### Geospatial / Map HUD Overlay
- Floating control decks pinned over GIS map viewports: `#FFFFFF` surface with `backdrop-filter: blur(12px)`, radius `10px`, border `1px solid #E2E7ED`, elevation Level 2.
- Layer selectors use active teal tinting (`#E8F4F1`) with `#137A70` text for selected spatial overlays (potholes, water mains, streetlamps).