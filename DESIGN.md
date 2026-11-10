# CoinLover Design System (DESIGN.md)

Design system and visual tokens for the CoinLover application and landing page, compliant with `@google/design.md` and the **Linear Style** design standard.

---

## 1. Global Core Tokens (Linear Style Standard)

```yaml
system:
  typography:
    primaryFont: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    headingFont: "Inter, sans-serif"
    serifAccent: "Lora, serif"
  radii:
    modal: "32px"
    card: "28px"
    element: "14px"
    pill: "9999px"
  brand:
    landingBackground: "#050505"
    brandAccent: "#6d5dfc"
    brandAccentHover: "#5b4ce3"
    brandPurpleGlow: "rgba(109, 93, 252, 0.2)"
  layout:
    appMaxWidth: "448px"
    gridGap: "8px"
```

---

## 2. The Three Application Themes

CoinLover supports three switchable user themes: **Black** (Default Dark Linear), **White** (Minimalist Precision), and **Mint** (Organic Neumorphic).

### Theme 1: Black ("Borderless Glow" / Linear Dark)
* **Design Philosophy:** Immersive, high-contrast dark aesthetic inspired by Linear and macOS Dark. Borderless translucent cards with subtle 1px specular borders and purple ambient glow.
* **Tokens:**
```yaml
theme: black
name: "Black Glow"
description: "Borderless with soft glow"
tokens:
  background: "#0D1117"
  panelBackground: "#0D1117"
  numpadBackground: "#0a0c10"
  primaryAccent: "#a78bfa"
  brandAccent: "#6d5dfc"
  dangerColor: "#f43f5e"
  successColor: "#10b981"
  textMain: "#FFFFFF"
  textMuted: "rgba(255, 255, 255, 0.5)"
  glassBackground: "rgba(255, 255, 255, 0.02)"
  glassCardBackground: "rgba(255, 255, 255, 0.03)"
  glassItemActive: "rgba(255, 255, 255, 0.05)"
  glassBorder: "rgba(255, 255, 255, 0.06)"
  glassBorderHighlight: "rgba(255, 255, 255, 0.1)"
  buttonEquals: "rgba(167, 139, 250, 0.2)"
  shadow: "rgba(0, 0, 0, 0.4)"
  pullIndicator: "#1e293b"
```

---

### Theme 2: White ("White Precision" / Minimalist Light)
* **Design Philosophy:** Minimalist, editorial clarity with a Slate palette. Pure white backgrounds with subtle slate borders and neutral tones for daylight finance tracking.
* **Tokens:**
```yaml
theme: white
name: "White Precision"
description: "Minimalist purity and clarity"
tokens:
  background: "#FFFFFF"
  panelBackground: "#F8FAFC"
  numpadBackground: "#FFFFFF"
  primaryAccent: "#64748B" # Slate 500
  dangerColor: "#f43f5e"
  successColor: "#10b981"
  textMain: "#1E293B" # Slate 800
  textMuted: "#94A3B8" # Slate 400
  glassBackground: "#FFFFFF"
  glassCardBackground: "#FFFFFF"
  glassItemBackground: "#F8FAFC"
  glassItemActive: "#F1F5F9"
  glassBorder: "#F1F5F9"
  glassBorderHighlight: "#E2E8F0"
  buttonEquals: "#F1F5F9"
  shadow: "rgba(15, 23, 42, 0.04)"
  pullIndicator: "#E2E8F0"
```

---

### Theme 3: Mint ("Organic Mint" / Neumorphism 2.0)
* **Design Philosophy:** Tactile and organic feel. Paper grain overlay, soft dual-direction extruded lighting (`--soft-ui-outset` and `--soft-ui-inset`), copper accents and warm green tones.
* **Tokens:**
```yaml
theme: mint
name: "Organic Mint"
description: "Organic feel and Soft UI"
tokens:
  background: "#E8F0ED"
  panelBackground: "#E8F0ED"
  numpadBackground: "#E8F0ED"
  primaryAccent: "#924A28" # Warm Copper
  dangerColor: "#BA1A1A" # Coral Red
  successColor: "#126D27" # Forest Green
  textMain: "#161D1C" # Near Black
  textMuted: "#434846" # Slate Grey
  glassBackground: "#E8F0ED"
  glassCardBackground: "#F3FBF8"
  glassItemBackground: "#F3FBF8"
  glassItemActive: "#DDE8E4"
  glassBorder: "#D1D9D6"
  glassBorderHighlight: "#CA8A04" # Harvest Gold
  buttonEquals: "#FFFFFF"
  shadow: "rgba(21, 29, 28, 0.08)"
  pullIndicator: "#D1D9D6"
  softUiOutset: "-4px -4px 12px rgba(255, 255, 255, 0.8), 4px 4px 12px rgba(209, 217, 214, 0.5)"
  softUiInset: "inset 2px 2px 5px rgba(209, 217, 214, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.8)"
  copperGradient: "rgba(255, 255, 255, 0.4)"
```

---

## 3. UI Component Standards

* **DND Drag & Drop Coins:** 
  - Standard diameter: `56px` to `64px` circular coins.
  - Haptic feedback on pickup and drop (`navigator.vibrate(40)`).
* **Linear Glow Controls:**
  - Segmented controls: Dark `#000000`/40 container with `p-1`, active button with `#6d5dfc` background and `0 2px 10px rgba(109,93,252,0.3)` glow.
* **Passkey / Biometric Standard:**
  - Modern passkey / Face ID binding with discoverable WebAuthn credentials.
