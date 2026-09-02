---
name: Arcane System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#4a4455'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#654a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#836100'
  on-tertiary-container: '#ffe2ab'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
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
  xl: 40px
  container-padding: 24px
  gutter: 16px
---

## Brand & Style

The design system is engineered for a modern TTRPG management experience that prioritizes clarity over cliché. It avoids the "weathered parchment" tropes of the genre in favor of a **Modern-Professional** aesthetic with **Subtle Ethereal** undertones. 

The personality is that of a "Digital Dungeon Master": organized, reliable, yet sparkled with magical potential. The style utilizes **Minimalism** as its base, using generous whitespace and precise typography to handle dense data, while incorporating **Glassmorphism** and vibrant accents to represent the "fantasy" element. The emotional response should be one of "effortless mastery"—the UI stays out of the way of the story, feeling like a high-end productivity tool that happens to belong in a wizard's tower.

## Colors

This design system uses a sophisticated palette where "Fantasy Violet" acts as the primary magical thread throughout the interface. 

- **Primary (Fantasy Violet):** Reserved for high-intent actions, active states, and brand-defining moments.
- **Secondary (Slate Blue):** Used for navigation, metadata, and grounded UI elements to balance the vibrancy of the primary.
- **Background & Surfaces:** The interface uses a "Very Light Bluish-White" (`#f8fafc`) for page backgrounds to reduce eye strain, while cards and containers use "Pure White" (`#ffffff`) to pop against the canvas.
- **Accents:** "Light Amber" is used sparingly for "Critical Success" moments, legendary item tiers, or high-priority notifications.

## Typography

The typography strategy balances modern SaaS efficiency with a sharp, contemporary edge. 

- **Headlines:** Uses **Hanken Grotesk** for a precise, engineered feel that looks "custom" compared to standard system fonts. High-level headers use a tighter letter spacing to create a sense of density and importance.
- **Body:** Uses **Inter** for maximum readability in long-form campaign notes and character sheets. It is functional, neutral, and ensures that complex tables remain legible.
- **Labels/Data:** Uses **Geist** for its monospaced-adjacent qualities, making it ideal for stat blocks, dice notation (e.g., 1d20+5), and technical metadata. Use uppercase for category headers to create clear visual anchors.

## Layout & Spacing

The design system employs a **Fluid Grid** model with strict vertical rhythm based on a 4px baseline. 

- **Desktop (1440px+):** 12-column grid, 24px margins, 16px gutters. Central content areas for lore should be capped at 800px for readability.
- **Tablet (768px - 1023px):** 8-column grid, 24px margins. Sidebars for character stats should collapse into a drawer or top-tabs.
- **Mobile (< 767px):** 4-column grid, 16px margins.
- **Rhythm:** Use "Lg" (24px) for spacing between unrelated sections and "Md" (16px) for spacing between elements within a card or container.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Ambient Shadows** to create a sense of organized hierarchy.

1.  **Level 0 (Base):** `#f8fafc` background. No shadow.
2.  **Level 1 (Cards/Content):** `#ffffff` surface. Shadow: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`.
3.  **Level 2 (Hover/Active):** Slightly lifted. Shadow: `0 10px 15px -3px rgba(124, 58, 237, 0.1), 0 4px 6px -4px rgba(124, 58, 237, 0.1)`. Note the subtle violet tint in the shadow to suggest "magical lift."
4.  **Level 3 (Modals/Popovers):** Highest elevation. High diffusion shadow with a 15% opacity violet tint.

Use **Glassmorphism** (Backdrop blur: 8px) specifically for navigation bars and sticky headers to maintain a sense of space and context while scrolling through deep lore.

## Shapes

The shape language is **Rounded**, leaning into a "Modern Soft" aesthetic. 

- **Default Elements:** Inputs, small buttons, and chips use a `0.5rem` (8px) radius.
- **Containers:** Primary cards and dashboard sections use `rounded-xl` (`1.5rem` or 24px) to create a friendly, approachable feel.
- **Specialty:** Dice rollers and "magic" toggle buttons use full pill-shaping (`rounded-full`) to differentiate them from standard administrative inputs.

## Components

- **Buttons:** Primary buttons use a solid "Fantasy Violet" background with white text. Secondary buttons use a Slate Blue outline. Ghost buttons are reserved for utility actions within lists.
- **Cards:** White background, `rounded-xl` corners, and the Level 1 shadow. Headers within cards should have a subtle bottom border (`1px solid #f1f5f9`).
- **Input Fields:** Use a subtle Slate Blue border (`#e2e8f0`) that transitions to a 2px "Fantasy Violet" ring on focus.
- **Chips/Badges:** Use low-saturation backgrounds of the primary color (e.g., 10% opacity Violet) with high-saturation text for status tags like "In Progress" or "NPC".
- **Stat Blocks:** Use a dedicated component with a "Geist" font, a light grey background (`#f1f5f9`), and sharp labels to mimic traditional RPG stat blocks but in a modern, clean format.
- **Icons:** Use **Lucide Icons** with a stroke width of 1.75px. Icons should follow the text color of the parent element, except when used as primary decorative anchors, where they take the Fantasy Violet color.
- **Progress Bars:** Use a "Fantasy Violet" to "Slate Blue" linear gradient for XP or HP bars to give a dynamic, high-quality feel.