# Design system

Plain, professional, monochrome (Vercel-like). Numbers first. Light and dark modes.

- **Tokens** are CSS variables in `src/styles/global.css` and are mapped into Tailwind (`bg-bg`,
  `text-muted`, `border-line`, `bg-accent`, ...). Never hard-code colours in components. Charts read
  the variables at runtime so they re-theme.
- **Colour** is used only for gains (`--pos`) and losses (`--neg`), always with a `+` / `-` sign so
  colour is never the only signal, and one blue (`--focus`) for focus rings and one chart line.
- **Type**: Geist Sans for text, Geist Mono for every number (`.num`: tabular figures, right
  aligned). Fonts are self-hosted (`public/fonts`).
- **Numbers**: Indian grouping (`₹12,34,567`), NAV to 4 decimals, returns to 2 decimals with a sign,
  `—` for a missing value (never `0`). All formatting is in `src/lib/format.ts`.
- **Layout**: 1px hairline borders, 6px radius, no shadows except popovers, no gradients.
- **Loading / error / empty states** are required for every data-driven view: skeleton of the same
  size (no layout jump), error with Retry, empty state with a way out.
- **Mobile**: nothing scrolls sideways except inside tables; filters collapse behind one button;
  popovers become viewport-wide panels.
- **CSS layers**: helper classes (`.num`, `.pos`, `.skeleton`, `.prose-mf`) live in
  `@layer components` so Tailwind utilities can override them. Unlayered CSS would always win.
- **Ads**: `src/components/AdSlot.astro` renders nothing until `PUBLIC_ADSENSE_CLIENT` is set.
