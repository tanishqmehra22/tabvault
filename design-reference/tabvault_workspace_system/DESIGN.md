---
name: TabVault Workspace System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 14px
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
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-compact: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies high-performance productivity for modern knowledge workers, engineers, researchers, and creators. Merging the laser-focused technical precision of Linear with the fluid, spatial aesthetic of Arc Browser and the structural utility of Notion, the system transforms browser tab chaos into an intentional knowledge repository.

### Visual Aesthetic & Movement
- **Precision Dark-Mode Modernism:** Deep obsidian and slate navy tones create an infinite, distraction-free spatial canvas.
- **Glassmorphic Micro-Depth:** Delicate translucent surfaces (frosted glass with backdrop-filter blur) layered over subtle radial chromatic glows (sapphire blue and cyan).
- **Tactile Density:** Information-dense, micro-scaled UI optimized for power users, keyboard navigators, and high-frequency everyday actions.
- **Crisp Structural Discipline:** 1px hairline translucent borders provide structural separation without visual weight.

## Colors

The palette relies on deep oceanic slates paired with electric photonic accents. It delivers contrast that meets WCAG AAA standards for reading comfort during extensive focus sessions.

### Core Canvas & Surface Hierarchy
- **Canvas Base (`#090D16`):** The ground floor for the extension popup and background workspace canvas.
- **Surface Layer 1 (`#0F172A`):** Structural sidebar panels, elevated workspace boards, and modal sheets.
- **Surface Layer 2 (`#1E293B`):** Active tab cards, input containers, and floating popovers.
- **Surface Elevated (`#334155`):** Hover states, nested tab chips, and tooltips.

### Accents & Illumination
- **Electric Sapphire (`#3B82F6` / `#2563EB`):** Primary interaction target, selection focus rings, and primary action states.
- **Luminous Teal/Cyan (`#06B6D4` / `#14B8A6`):** Tab organization groupings, active sync signals, and smart workspace indicators.
- **Success Emerald (`#10B981`):** Tab archive confirmation, memory saved indicators, and health checks.
- **Warning Amber (`#F59E0B`):** Tab duplicates and high-memory usage badges.
- **Destructive Rose (`#EF4444`):** Discard, close-all, and purge alerts.

### High-Contrast Foregrounds
- **Text Primary (`#F8FAFC`):** Active tab titles, headers, and essential metrics.
- **Text Secondary (`#94A3B8`):** Tab domain URLs, folder paths, and hotkey labels.
- **Text Muted (`#64748B`):** Timestamp metadata, passive badges, and placeholder values.
- **Borders & Separators (`rgba(255, 255, 255, 0.08)`): Crisp 1px hairlines.

## Typography

Typography balances clean geometric elegance (Plus Jakarta Sans) with ultra-legible, pixel-fitted technical execution (Inter).

- **Display & Headlines:** Plus Jakarta Sans is applied exclusively to prominent headers, modal titles, and workspace section headings, delivering modern identity with tight tracking (`-0.025em`).
- **Body & Tab Entities:** Inter drives high-density operational components. Tab titles render with crisp clarity at `13px`, optimizing viewport usage in both tight 380px popups and multi-column desktop grids.
- **Kbd & System Tags:** Sub-12px elements utilize semi-bold and medium weights with slight positive tracking to ensure instant readability for shortcuts (`⌘K`, `⌥⇧W`) and memory metrics.

## Layout & Spacing

The layout architecture shifts seamlessly between two operational modalities: the **380px Fixed Compact Extension Popup** and the **Expansive Full-Screen Desktop Dashboard**.

### Responsive Modalities
- **Compact Viewport (380px Extension Popup / Side Panel):**
  - Outer margins: `margin-compact` (12px / 0.75rem).
  - Internal gaps: `gutter-compact` (8px / 0.5rem).
  - Single vertical column with pinned header search, virtualized scroll list of tabs, and sticky macro action dock at the footer.
- **Dashboard Viewport (1024px+ Full Canvas):**
  - Fluid 12-column grid layout with collapsible navigation rail (240px fixed), contextual grouping columns, and active workspace boards.
  - Margins: `margin` (24px / 1.5rem); gutters: `gutter` (16px / 1rem).

### Vertical Rhythm
A base 4px spatial multiplier coordinates micro-paddings:
- **`space-xs` (4px):** Badge padding, tag gap, icon-to-label separation.
- **`space-sm` (8px):** Row item padding, keyboard shortcut pill margins, nested list indents.
- **`space-md` (12px):** Card interior padding, panel separation.
- **`space-lg` (20px):** Modal container padding, section breaks.
- **`space-xl` (32px):** Major dashboard module separators.

## Elevation & Depth

Visual hierarchy uses physical luminosity and frosted glass physics rather than standard drop shadows.

### Glassmorphism & Surface Tiers
- **Tier 0 (Base Canvas):** Solid dark base (`#090D16`), no blur, no illumination.
- **Tier 1 (Panels & Toolbars):** Background `rgba(15, 23, 42, 0.75)` with `backdrop-filter: blur(16px)` and a subtle 1px border `rgba(255, 255, 255, 0.06)`.
- **Tier 2 (Interactive Tab Items & Cards):** Background `rgba(30, 41, 59, 0.65)` with `backdrop-filter: blur(8px)`. On hover, the surface shifts to `rgba(51, 65, 85, 0.8)` with an inner ambient glow: `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1)`.
- **Tier 3 (Floating Command Palettes, Menus, & Tooltips):** Background `rgba(15, 23, 42, 0.92)` with `backdrop-filter: blur(24px)`, framed by a crisp border `rgba(59, 130, 246, 0.25)` and a soft external blue glow: `0 16px 36px -8px rgba(0, 0, 0, 0.6), 0 0 18px 0 rgba(59, 130, 246, 0.15)`.

### Chromatic Light Flares
Subtle, high-deflection radial background gradients (`rgba(6, 182, 212, 0.08)` and `rgba(37, 99, 235, 0.08)`) sit behind active group clusters to denote active focus zones without cluttering text contrast.

## Shapes

The design system employs a refined soft-radius philosophy (`roundedness: 1`). This strikes a balance between Linear's sharp engineering precision and Arc's approachable, organic curvature.

### Token Specifications
- **Base Components (`rounded`: 4px / 0.25rem):** Micro pills, keyboard shortcut badges (`kbd`), status dots, tab favicon containers, and nested micro-buttons.
- **Container Elements (`rounded-lg`: 8px / 0.5rem):** Tab item list rows, search input fields, dropdown menus, button groups, and toolbar wrappers.
- **Structural Modules (`rounded-xl`: 12px / 0.75rem):** Modal windows, popup extension frame boundaries, preview cards, and drag-and-drop workspace columns.
- **Special Elements (Full Pill / 9999px):** Status indicators, active workspace mode selectors, and tag filters.

## Components

### Buttons
- **Primary:** Solid electric blue (`#2563EB`) gradient to sapphire (`#3B82F6`), high-contrast white text, subtle top inner-bevel (`inset 0 1px 0 rgba(255, 255, 255, 0.2)`), 8px radius. Active state scales slightly (`transform: scale(0.98)`).
- **Secondary / Ghost:** Transparent background with 1px border (`rgba(255, 255, 255, 0.08)`). On hover: background `rgba(255, 255, 255, 0.05)`, border color transitions to `rgba(255, 255, 255, 0.15)`.
- **Icon Actions:** 28×28px micro-bounds with 4px border-radius, centering 14px iconography.

### Inputs & Omnibar Search
- **Linear-style Command Input:** Dark slate container (`rgba(15, 23, 42, 0.8)`), 8px border-radius, 1px border `rgba(255, 255, 255, 0.1)`. Focus brings a sharp cyan/sapphire glow ring (`0 0 0 2px rgba(6, 182, 212, 0.4)`).
- **Trailing Shortcut Pill:** Integrated keyboard cue (`⌘K`) aligned to the right inside the input field.

### Tab Item Rows (Core Molecule)
- **Structure:** 36px height in popup, 42px in dashboard. Left: 16×16px tab favicon with 4px rounded background; Center: truncated title (`body-md`) and domain subtitle (`body-sm`, muted); Right: memory/audio indicator, quick close button (visible on hover).
- **Selection State:** Left edge 2px indicator bar in electric sapphire; background fill: `rgba(59, 130, 246, 0.1)`.

### Keyboard Shortcut Pills (`kbd`)
- **Visuals:** 18px height, min-width 18px, font: `code-sm` (11px, weight: 600), background `rgba(255, 255, 255, 0.06)`, text `#94A3B8`, border `1px solid rgba(255, 255, 255, 0.12)`, radius 4px, subtle vertical drop shadow `0 1px 2px rgba(0, 0, 0, 0.3)`.

### Chips & Workspace Status Pills
- **Grouping Chips:** Compact rounded pills with a 6px color dot matching the user's category (Cyan for "Research", Sapphire for "Dev", Emerald for "Reading List").
- **Metrics Chips:** Ultra-compact badges showing tab counts and RAM footprint savings (`-240MB`), styled in subtle muted green text on translucent green wash.

### Cards & Workspace Boards
- **Board Column Container:** Subtle slate wash, 12px roundedness, 1px perimeter border, containing dragged and prioritized tab item cards with smooth drag-over highlights.