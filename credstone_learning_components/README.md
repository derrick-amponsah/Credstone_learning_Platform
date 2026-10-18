# Credstone Learning: frontend handoff

- `design-system/` the full design system: tokens (css + json), 44 component specs with previews, 107 SVG assets (icons, logos, badges, illustrations).
- `screens/html/` the 24 screens as plain HTML. Open in a browser. They use `css/` only (no scripts).
- `screens/png/` the same screens as images (2x), as used in the slides.
- `css/tokens.css` colour, type and spacing variables (same as the design system).
- `css/screens.css` the layout classes the screens use (`.m-*`). Treat as reference for building components.
- `css/fonts.css` + `fonts/` Source Serif 4 and Source Sans 3 (self-hosted woff2).

Notes
- Icons inside the screens are inline SVG from the 24px icon set; the same icons are in `design-system/.../assets/Icons`. The logo mark is in `assets/Logos`.
- Screens contain no photos. Course thumbnails are simple illustrations built in SVG.
- Several screen patterns (auth split layout, form fields, toggles, alerts, rubric, radio cards) are in `css/screens.css` but are not yet separate component specs in the design system.
