---
name: MacroTrack
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#555c6e'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e7487'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#dce2f7'
  tertiary-fixed-dim: '#c0c6db'
  on-tertiary-fixed: '#141b2b'
  on-tertiary-fixed-variant: '#404758'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  data-display:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  container-margin-mobile: 16px
  container-margin-desktop: 40px
  gutter: 16px
---

## Brand & Style
The brand personality is clinical yet compassionate—a digital wellness companion that feels organized and effortless. It targets health-conscious individuals who require precision without the cognitive load of cluttered interfaces. 

The design system adopts a **Modern Minimalist** style with a focus on **Soft Tonal Layers**. It avoids harsh lines in favor of generous whitespace and organic shapes, creating a "breathable" interface that reduces the anxiety often associated with calorie tracking. The aesthetic is professional and trustworthy, prioritizing data legibility and a sense of daily progress.

## Colors
The palette is rooted in a soft, off-white foundation to ensure the interface feels light and clean. 

- **Primary (Teal):** Used for main actions, active states, and brand reinforcement.
- **Macro Accents:** Carbs (Amber), Protein (Blue), and Fats (Purple) are used strictly for data visualization and nutrition breakdowns. They must maintain high contrast against the light background.
- **Surface Colors:** A secondary off-white (`#F8FAFC`) is used for card backgrounds to subtly lift them from the page background (`#F1F5F9`).

## Typography
This design system utilizes **Manrope** for its modern, balanced, and highly legible characteristics. It performs exceptionally well for both numeric data and long-form list items.

- **Headlines:** Bold and tight-tracking to establish clear hierarchy.
- **Data Display:** A specialized role for large macro numbers, using extra-bold weights to emphasize daily totals.
- **Labels:** Used for categories and macro titles (Carbs, Protein, Fats), often paired with the specific macro color.

## Layout & Spacing
The layout follows a **Fluid-to-Fixed** hybrid model. 

- **Mobile-First:** Elements span the full width minus a `16px` margin. Lists and cards are stacked vertically.
- **Desktop Reflow:** At `1024px`, a fixed-width left sidebar (280px) appears for primary navigation. The main content area utilizes a max-width container of `1200px` centered on the screen.
- **Rhythm:** A 4px baseline grid ensures consistent vertical rhythm. Use `16px` (md) for internal card padding and `24px` (lg) for spacing between distinct sections.

## Elevation & Depth
Depth is created through **Tonal Layers** and extremely soft **Ambient Shadows**.

- **Level 0 (Background):** The page background (`#F1F5F9`) is the lowest layer.
- **Level 1 (Cards/Surface):** Primary content containers use a white background with a subtle, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)) to appear "hovering" slightly above the surface.
- **Interactive Elements:** Buttons and active inputs utilize a slightly more defined shadow on hover to provide tactile feedback without looking heavy.
- **Overlays:** Modals and bottom sheets use a `20%` backdrop blur to maintain context while focusing user attention.

## Shapes
The shape language is defined by **High Roundedness** to evoke a friendly and modern feel.

- **Standard Elements:** Buttons and input fields use `0.5rem` (8px) corners.
- **Cards & Containers:** Use `1.5rem` (24px) for `rounded-xl` to create the distinct "soft pod" look requested.
- **Progress Bars:** Use a full "pill" radius for tracking macro goals to ensure the UI feels fluid and continuous.

## Components
- **Buttons:** Primary buttons are solid Teal with white text. Secondary buttons use a light teal tint (`#F0FDFA`) with Teal text.
- **Macro Progress Rings:** Circular indicators for daily totals. Use a `12px` stroke width with rounded ends. The "track" (remaining) should be a light gray version of the macro color.
- **Cards:** White background, `24px` corner radius, and `20px` internal padding. Cards should contain a single functional unit (e.g., "Breakfast" or "Daily Summary").
- **Food List Items:** Soft dividers between items. Use a leading icon or colored dot (based on dominant macro) for quick visual scanning.
- **Input Fields:** Large, easy-to-tap touch targets (min-height 48px). Use a light gray border that turns Teal on focus.
- **Chips:** Small, pill-shaped tags used for "Quick Add" or "Recent" items, using `body-sm` typography and subtle background tints.